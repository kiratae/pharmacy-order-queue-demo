import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsOptional, IsPositive, IsString, MinLength, ValidateNested } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  @IsPositive()
  qty!: number;
}

export class CreateOrderDto {
  @IsString()
  @MinLength(1)
  consultationId!: string;

  @IsString()
  @MinLength(1)
  unitId!: string;

  @IsOptional()
  @IsString()
  patientName?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ArrayMinSize(1)
  items!: CreateOrderItemDto[];
}
