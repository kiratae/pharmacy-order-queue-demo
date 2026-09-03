import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OrderStatus } from '@prisma/client';

const STATUSES = Object.values(OrderStatus);

export class ListOrdersQueryDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @IsOptional()
  @IsIn(['updatedAt'])
  sort?: string;
}
