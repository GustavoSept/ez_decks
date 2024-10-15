import { IsString, IsOptional, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { DEFAULT_SYS_MESSAGE, DEFAULT_USER_MESSAGE_PREFIX } from '../openai/constants';

export class LoadAndCreateBatchFileDto {
   @IsString()
   @IsOptional()
   @Transform(({ value }) => value || DEFAULT_SYS_MESSAGE)
   systemMessage: string = DEFAULT_SYS_MESSAGE;

   @IsString()
   @IsOptional()
   @Transform(({ value }) => value || DEFAULT_USER_MESSAGE_PREFIX)
   userMessagePrefix: string = DEFAULT_USER_MESSAGE_PREFIX;

   @IsInt()
   @IsOptional()
   @Transform(({ value }) => parseInt(value) || 8)
   wordCapacity: number = 8;

   @IsInt()
   @IsOptional()
   @Transform(({ value }) => parseInt(value) || 50_000)
   maxBatchSize: number = 50_000;
}
