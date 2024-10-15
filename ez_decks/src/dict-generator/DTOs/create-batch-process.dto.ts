import { IsString, IsOptional, IsNotEmpty, IsObject } from 'class-validator';

export class CreateBatchProcessDto {
   @IsString()
   @IsNotEmpty()
   inputFileId!: string;

   @IsOptional()
   @IsObject()
   metadata?: Record<string, any>;
}
