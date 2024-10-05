import { IsString, IsOptional } from 'class-validator';
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
}
