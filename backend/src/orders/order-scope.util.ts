import { ForbiddenException } from '@nestjs/common';
import type { Prisma, Order } from '@prisma/client';
import type { AuthUser } from '../auth/auth-user.type.js';

/** Single shared place for role/unit scoping — never repeat this per-endpoint. */
export function buildScopeWhere(authUser: AuthUser): Prisma.OrderWhereInput {
  if (authUser.role === 'OWNER') return {};
  return { unitId: authUser.unitId };
}

export function assertUnitAccess(authUser: AuthUser, order: Pick<Order, 'unitId'>): void {
  if (authUser.role === 'PHARMACIST' && order.unitId !== authUser.unitId) {
    throw new ForbiddenException('Order belongs to a different unit');
  }
}
