import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, OrderStatus, ItemStatus, type Order, type OrderItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth-user.type.js';
import { buildScopeWhere, assertUnitAccess } from './order-scope.util.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import type { ReviewOrderDto } from './dto/review-order.dto.js';
import type { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';

type OrderRow = Order & { items: OrderItem[]; unit: { name: string } };
type OrderWithItems = Omit<OrderRow, 'unit'> & { unitName: string };

const ORDER_INCLUDE = { items: true, unit: { select: { name: true } } } satisfies Prisma.OrderInclude;

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

function toOrderWithItems(order: OrderRow): OrderWithItems {
  const { unit, ...rest } = order;
  return { ...rest, unitName: unit.name };
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto, idempotencyKey?: string): Promise<OrderWithItems> {
    if (idempotencyKey) {
      const existing = await this.prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
      if (existing) {
        return existing.responseBody as unknown as OrderWithItems;
      }
    }

    const data: Prisma.OrderUncheckedCreateInput = {
      consultationId: dto.consultationId,
      unitId: dto.unitId,
      patientName: dto.patientName,
      items: { create: dto.items.map((item) => ({ name: item.name, qty: item.qty })) },
    };

    if (!idempotencyKey) {
      const order = await this.prisma.order.create({ data, include: ORDER_INCLUDE });
      return toOrderWithItems(order);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = toOrderWithItems(await tx.order.create({ data, include: ORDER_INCLUDE }));
        await tx.idempotencyKey.create({
          data: { key: idempotencyKey, orderId: order.id, responseBody: order as unknown as Prisma.InputJsonValue },
        });
        return order;
      });
    } catch (err) {
      // Concurrent request with the same key won the race to insert the key row first.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        const winner = await this.prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
        if (winner) return winner.responseBody as unknown as OrderWithItems;
      }
      throw err;
    }
  }

  async list(query: ListOrdersQueryDto, authUser: AuthUser): Promise<{ data: OrderWithItems[]; count: number }> {
    const where: Prisma.OrderWhereInput = {
      ...buildScopeWhere(authUser),
      ...(query.status ? { status: query.status } : {}),
      ...(authUser.role === 'OWNER' && query.unitId ? { unitId: query.unitId } : {}),
    };

    const [data, count] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: data.map(toOrderWithItems), count };
  }

  async summary(authUser: AuthUser, unitId?: string): Promise<Record<OrderStatus, number>> {
    const where: Prisma.OrderWhereInput = {
      ...buildScopeWhere(authUser),
      ...(authUser.role === 'OWNER' && unitId ? { unitId } : {}),
    };

    const grouped = await this.prisma.order.groupBy({ by: ['status'], where, _count: true });
    const counts = Object.fromEntries(Object.values(OrderStatus).map((s) => [s, 0])) as Record<OrderStatus, number>;
    for (const g of grouped) counts[g.status] = g._count;
    return counts;
  }

  async findOne(id: string, authUser: AuthUser): Promise<OrderWithItems> {
    const order = await this.getOrderOrThrow(id);
    assertUnitAccess(authUser, order);
    return order;
  }

  async review(id: string, dto: ReviewOrderDto, authUser: AuthUser): Promise<OrderWithItems> {
    const order = await this.getOrderOrThrow(id);
    assertUnitAccess(authUser, order);
    this.assertTransition(order, ['RECEIVED']);
    this.assertNotStale(order, dto.expectedUpdatedAt);

    const rejectedIds = dto.rejectedItems.map((r) => r.id);
    const targetedIds = [...dto.acceptedItemIds, ...rejectedIds];
    const orderItemIds = order.items.map((item) => item.id);

    if (new Set(targetedIds).size !== targetedIds.length) {
      throw new UnprocessableEntityException('An item cannot appear more than once in the review');
    }
    if (targetedIds.length !== orderItemIds.length || !orderItemIds.every((id) => targetedIds.includes(id))) {
      throw new UnprocessableEntityException('Review must cover every item on the order exactly once');
    }
    for (const item of order.items) {
      if (item.status !== 'PENDING') {
        throw new ConflictException(`Item ${item.id} was already reviewed`);
      }
    }
    for (const rejected of dto.rejectedItems) {
      if (!rejected.reason || !rejected.reason.trim()) {
        throw new UnprocessableEntityException(`Reject reason is required for item ${rejected.id}`);
      }
    }

    const resultingStatuses = order.items.map((item) =>
      rejectedIds.includes(item.id) ? 'REJECTED' : 'ACCEPTED',
    );
    const newStatus = computeReviewedStatus(resultingStatuses);

    return this.prisma.$transaction(async (tx) => {
      await Promise.all([
        ...dto.acceptedItemIds.map((itemId) =>
          tx.orderItem.update({ where: { id: itemId }, data: { status: ItemStatus.ACCEPTED } }),
        ),
        ...dto.rejectedItems.map((r) =>
          tx.orderItem.update({ where: { id: r.id }, data: { status: ItemStatus.REJECTED, rejectReason: r.reason } }),
        ),
      ]);
      const order = await tx.order.update({ where: { id }, data: { status: newStatus }, include: ORDER_INCLUDE });
      return toOrderWithItems(order);
    });
  }

  async ready(id: string, expectedUpdatedAt: string | undefined, authUser: AuthUser): Promise<OrderWithItems> {
    const order = await this.getOrderOrThrow(id);
    assertUnitAccess(authUser, order);
    this.assertTransition(order, ['ACCEPTED', 'PARTIALLY_ACCEPTED']);
    this.assertNotStale(order, expectedUpdatedAt);

    const updated = await this.prisma.order.update({ where: { id }, data: { status: OrderStatus.READY }, include: ORDER_INCLUDE });
    return toOrderWithItems(updated);
  }

  async complete(id: string, expectedUpdatedAt: string | undefined, authUser: AuthUser): Promise<OrderWithItems> {
    const order = await this.getOrderOrThrow(id);
    assertUnitAccess(authUser, order);
    this.assertTransition(order, ['READY']);
    this.assertNotStale(order, expectedUpdatedAt);

    const updated = await this.prisma.order.update({ where: { id }, data: { status: OrderStatus.COMPLETED }, include: ORDER_INCLUDE });
    return toOrderWithItems(updated);
  }

  private async getOrderOrThrow(id: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException('Order not found');
    return toOrderWithItems(order);
  }

  private assertTransition(order: Order, allowedFrom: OrderStatus[]): void {
    if (!allowedFrom.includes(order.status)) {
      throw new ConflictException(`Cannot perform this action while order is ${order.status}`);
    }
  }

  private assertNotStale(order: Order, expectedUpdatedAt: string | undefined): void {
    if (!expectedUpdatedAt) return;
    if (new Date(expectedUpdatedAt).getTime() !== order.updatedAt.getTime()) {
      throw new ConflictException('Order was modified since it was last loaded');
    }
  }
}

function computeReviewedStatus(itemStatuses: string[]): OrderStatus {
  if (itemStatuses.every((s) => s === 'ACCEPTED')) return OrderStatus.ACCEPTED;
  if (itemStatuses.every((s) => s === 'REJECTED')) return OrderStatus.REJECTED;
  return OrderStatus.PARTIALLY_ACCEPTED;
}
