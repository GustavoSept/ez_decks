import { DEFAULT_SYS_MESSAGE, DEFAULT_USER_MESSAGE_PREFIX } from '../openai/constants';
import { IsArrayOfNonEmptyStringArrays } from '../../common/utils/validators/is-array-of-non-empty-string-arrays';
import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBatchFileDto {
   @IsArrayOfNonEmptyStringArrays({
      message: 'wordList must be an array of non-empty arrays of non-empty strings',
   })
   wordList!: string[][];

   @IsString()
   @IsOptional()
   @Transform(({ value }) => value || DEFAULT_SYS_MESSAGE)
   systemMessage: string;

   @IsString()
   @IsOptional()
   @Transform(({ value }) => value || DEFAULT_USER_MESSAGE_PREFIX)
   userMessagePrefix: string = DEFAULT_USER_MESSAGE_PREFIX;

   constructor() {
      this.systemMessage = DEFAULT_SYS_MESSAGE;
   }
}
