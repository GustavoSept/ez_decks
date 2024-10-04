import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { DEFAULT_SYS_MESSAGE } from '../openai/constants';

export class LoadAndCreateBatchFileDto {
   @IsString()
   @IsOptional()
   @Transform(({ value }) => value || DEFAULT_SYS_MESSAGE)
   systemMessage: string = DEFAULT_SYS_MESSAGE;
}
