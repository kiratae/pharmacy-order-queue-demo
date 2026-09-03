import { IsOptional, IsString } from 'class-validator';

export class ActionOrderDto {
  @IsOptional()
  @IsString()
  expectedUpdatedAt?: string;
}
