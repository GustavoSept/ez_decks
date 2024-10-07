import { Injectable } from '@nestjs/common';
import { BatchResponse, BatchResult } from './openai/types/batch-result';
import { GermanTranslationResponseType, ErrorInfo } from './structs/translation-response.zod';

@Injectable()
export class DictGeneratorService {
   /**
    * Splits the content of a .txt file into an array of arrays, each containing up to batchSize elements.
    */
   splitFileIntoBatches(fileContent: Buffer, batchSize: number = 8): string[][] {
      // Convert buffer to string and split by new lines
      const lines = fileContent
         .toString('utf-8')
         .split(/\r?\n/) // Split by line-break (\r is windows-specific and optional, \n is global)
         .filter((line) => line.trim() !== '');

      const batches: string[][] = [];

      for (let i = 0; i < lines.length; i += batchSize) {
         batches.push(lines.slice(i, i + batchSize));
      }

      return batches;
   }

   /**
    * Extracts the German words and their translations from the batch response.
    */
   extractWordsAndTranslations(batchResponse: BatchResponse): { words: GermanTranslationResponseType['response']; errors: ErrorInfo[] } {
      const words: GermanTranslationResponseType['response'] = [];
      const errors: ErrorInfo[] = [];

      batchResponse.results.forEach((result) => {
         if (result.error) {
            errors.push(this.extractErrorInfo(result));
         } else if (result.response.body.choices[0].message.refusal) {
            errors.push(this.extractRefusalInfo(result));
         } else {
            words.push(...this.extractValidWords(result));
         }
      });

      return { words, errors };
   }

   /**
    * Extracts valid German words and translations from a batch result.
    */
   private extractValidWords(result: BatchResult): GermanTranslationResponseType['response'] {
      const messageContent = result.response.body.choices[0].message.content;
      const parsedContent: GermanTranslationResponseType = JSON.parse(messageContent);
      return parsedContent.response;
   }

   /**
    * Extracts error information from a batch result.
    */
   private extractErrorInfo(result: BatchResult): ErrorInfo {
      return {
         custom_id: result.custom_id,
         error: result.error,
      };
   }

   /**
    * Extracts refusal information from a batch result.
    */
   private extractRefusalInfo(result: BatchResult): ErrorInfo {
      return {
         custom_id: result.custom_id,
         error: result.response.body.choices[0].message.refusal,
      };
   }
}
