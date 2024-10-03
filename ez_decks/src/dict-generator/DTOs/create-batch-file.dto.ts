import { IsString, IsOptional } from 'class-validator';
import { IsArrayOfNonEmptyStringArrays } from '../../common/utils/validators/is-array-of-non-empty-string-arrays';

export class CreateBatchFileDto {
   @IsArrayOfNonEmptyStringArrays({
      message: 'wordList must be an array of non-empty arrays of non-empty strings',
   })
   wordList!: string[][];

   @IsString()
   @IsOptional()
   systemMessage: string;

   constructor() {
      this.systemMessage = "You're a helpful assistant";
   }
}
