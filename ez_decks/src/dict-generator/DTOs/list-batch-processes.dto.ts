import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListBatchProcessesDto {
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   limit?: number;

   @IsOptional()
   @IsString()
   after?: string;
}
