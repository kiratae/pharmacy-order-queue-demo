import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { UnitsModule } from './units/units.module.js';
import { AuthGuard } from './auth/auth.guard.js';
import { ResponseEnvelopeInterceptor } from './common/response-envelope.interceptor.js';
import { RequestIdMiddleware } from './common/request-id.middleware.js';

@Module({
  imports: [PrismaModule, OrdersModule, UnitsModule],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
