import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class RejectedItemDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewOrderDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  acceptedItemIds!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RejectedItemDto)
  rejectedItems!: RejectedItemDto[];

  @IsOptional()
  @IsString()
  expectedUpdatedAt?: string;
}
