import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ReviewOrderDto } from './dto/review-order.dto.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { ActionOrderDto } from './dto/action-order.dto.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import type { AuthUser } from '../auth/auth-user.type.js';

@Controller('rest/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateOrderDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.orders.create(dto, idempotencyKey);
  }

  @Get()
  list(@Query() query: ListOrdersQueryDto, @CurrentUser() authUser: AuthUser) {
    return this.orders.list(query, authUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() authUser: AuthUser) {
    return this.orders.findOne(id, authUser);
  }

  @Post(':id/review')
  review(@Param('id') id: string, @Body() dto: ReviewOrderDto, @CurrentUser() authUser: AuthUser) {
    return this.orders.review(id, dto, authUser);
  }

  @Post(':id/ready')
  ready(@Param('id') id: string, @Body() dto: ActionOrderDto, @CurrentUser() authUser: AuthUser) {
    return this.orders.ready(id, dto.expectedUpdatedAt, authUser);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: ActionOrderDto, @CurrentUser() authUser: AuthUser) {
    return this.orders.complete(id, dto.expectedUpdatedAt, authUser);
  }
}
