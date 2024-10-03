import { DEFAULT_SYS_MESSAGE } from '../openai/constants';
import { IsArrayOfNonEmptyStringArrays } from '../../common/utils/validators/is-array-of-non-empty-string-arrays';
import { IsString, IsOptional } from 'class-validator';

export class CreateBatchFileDto {
   @IsArrayOfNonEmptyStringArrays({
      message: 'wordList must be an array of non-empty arrays of non-empty strings',
   })
   wordList!: string[][];

   @IsString()
   @IsOptional()
   systemMessage: string;

   constructor() {
      this.systemMessage = DEFAULT_SYS_MESSAGE;
   }
}
