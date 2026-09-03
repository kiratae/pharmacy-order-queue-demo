import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser, Role } from './auth-user.type.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

const VALID_ROLES: Role[] = ['OWNER', 'PHARMACIST'];

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { authUser: AuthUser }>();

    const userId = request.header('x-user-id');
    const role = request.header('x-role');
    const unitId = request.header('x-unit-id');

    if (!userId || !role || !VALID_ROLES.includes(role as Role)) {
      throw new ForbiddenException('Missing or invalid auth headers');
    }
    if (role === 'PHARMACIST' && !unitId) {
      throw new ForbiddenException('PHARMACIST requires x-unit-id');
    }

    request.authUser = { userId, role: role as Role, unitId };
    return true;
  }
}
