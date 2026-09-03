import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrdersService } from '../src/orders/orders.service.js';
import type { AuthUser } from '../src/auth/auth-user.type.js';

const OWNER: AuthUser = { userId: 'owner-1', role: 'OWNER' };
const PHARMACIST_U1: AuthUser = { userId: 'p1', role: 'PHARMACIST', unitId: 'u1' };
const PHARMACIST_U2: AuthUser = { userId: 'p2', role: 'PHARMACIST', unitId: 'u2' };

function makeOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'order-1',
    consultationId: 'CS-1',
    unitId: 'u1',
    patientName: 'Somchai',
    status: 'RECEIVED',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    items: [
      { id: 'item-1', orderId: 'order-1', name: 'Paracetamol', qty: 10, status: 'PENDING', rejectReason: null },
      { id: 'item-2', orderId: 'order-1', name: 'Amoxicillin', qty: 5, status: 'PENDING', rejectReason: null },
    ],
    ...overrides,
  };
}

// $transaction in the service is called with a callback that itself uses `tx.order`/`tx.orderItem`,
// so the fake's $transaction must invoke the callback with the same fake client.
function fakePrismaForReview(order: ReturnType<typeof makeOrder>) {
  const prisma: any = {
    order: {
      findUnique: vi.fn().mockResolvedValue(order),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...order, ...data })),
    },
    orderItem: {
      update: vi.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
    },
  };
  prisma.$transaction = vi.fn().mockImplementation((fn: any) => fn(prisma));
  return prisma;
}

describe('OrdersService state machine', () => {
  let order: ReturnType<typeof makeOrder>;
  let prisma: any;
  let service: OrdersService;

  beforeEach(() => {
    order = makeOrder();
    prisma = fakePrismaForReview(order);
    service = new OrdersService(prisma);
  });

  it('review: mixed accept/reject -> PARTIALLY_ACCEPTED', async () => {
    const result = await service.review(
      'order-1',
      { acceptedItemIds: ['item-1'], rejectedItems: [{ id: 'item-2', reason: 'Out of stock' }] },
      OWNER,
    );
    expect(result.status).toBe('PARTIALLY_ACCEPTED');
  });

  it('review: all accepted -> ACCEPTED', async () => {
    const result = await service.review(
      'order-1',
      { acceptedItemIds: ['item-1', 'item-2'], rejectedItems: [] },
      OWNER,
    );
    expect(result.status).toBe('ACCEPTED');
  });

  it('review: all rejected -> REJECTED', async () => {
    const result = await service.review(
      'order-1',
      {
        acceptedItemIds: [],
        rejectedItems: [
          { id: 'item-1', reason: 'Out of stock' },
          { id: 'item-2', reason: 'Recalled' },
        ],
      },
      OWNER,
    );
    expect(result.status).toBe('REJECTED');
  });

  it('review: reject without reason -> 422', async () => {
    await expect(
      service.review('order-1', { acceptedItemIds: ['item-1'], rejectedItems: [{ id: 'item-2', reason: '' }] }, OWNER),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('review: order not in RECEIVED -> 409', async () => {
    order.status = 'ACCEPTED';
    await expect(
      service.review('order-1', { acceptedItemIds: ['item-1', 'item-2'], rejectedItems: [] }, OWNER),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('review: item already reviewed -> 409', async () => {
    order.items[0].status = 'ACCEPTED';
    await expect(
      service.review('order-1', { acceptedItemIds: ['item-1', 'item-2'], rejectedItems: [] }, OWNER),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('review: stale expectedUpdatedAt -> 409', async () => {
    await expect(
      service.review(
        'order-1',
        { acceptedItemIds: ['item-1', 'item-2'], rejectedItems: [], expectedUpdatedAt: '2020-01-01T00:00:00.000Z' },
        OWNER,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('review: PHARMACIST on another unit -> 403', async () => {
    await expect(
      service.review('order-1', { acceptedItemIds: ['item-1', 'item-2'], rejectedItems: [] }, PHARMACIST_U2),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('review: PHARMACIST on own unit succeeds', async () => {
    const result = await service.review(
      'order-1',
      { acceptedItemIds: ['item-1', 'item-2'], rejectedItems: [] },
      PHARMACIST_U1,
    );
    expect(result.status).toBe('ACCEPTED');
  });

  it('ready: while RECEIVED -> 409', async () => {
    await expect(service.ready('order-1', undefined, OWNER)).rejects.toMatchObject({ status: 409 });
  });

  it('ready: from ACCEPTED succeeds', async () => {
    order.status = 'ACCEPTED';
    const result = await service.ready('order-1', undefined, OWNER);
    expect(result.status).toBe('READY');
  });

  it('complete: while ACCEPTED (not READY) -> 409', async () => {
    order.status = 'ACCEPTED';
    await expect(service.complete('order-1', undefined, OWNER)).rejects.toMatchObject({ status: 409 });
  });

  it('complete: from READY succeeds', async () => {
    order.status = 'READY';
    const result = await service.complete('order-1', undefined, OWNER);
    expect(result.status).toBe('COMPLETED');
  });
});
