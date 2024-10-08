import { Injectable } from '@nestjs/common';
import { levenshteinEditDistance } from 'levenshtein-edit-distance';
import { BatchResponse, BatchResult } from './openai/types/batch-result';
import {
   GermanTranslationResponseType,
   ErrorInfo,
   TranslationWithSimilarWords,
   GenericTranslationShape,
} from './structs/translation-response.structs';

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

   /**
    * Gathers `similar_words` field, based on letter edit distances. The distance check is run on the words themselves, and their translations.
    * @param input Some `WesternTranslationResponse` input
    * @param distanceThreshold Match definition: any word pair with distance <= distanceThreshold
    * @param maxNeighbours word amount to run the algorithm on (in each direction)
    */
   addSimilarWords<T extends GenericTranslationShape>(
      input: T[],
      distanceThreshold: number = 3,
      maxNeighbours: number = 30
   ): TranslationWithSimilarWords<T>[] {
      return input.map((currentWord, index) => {
         const similarWords: string[] = [];

         // Determine the range of neighboring words to consider
         const start = Math.max(0, index - maxNeighbours);
         const end = Math.min(input.length, index + maxNeighbours + 1);

         for (let i = start; i < end; i++) {
            if (i == index) continue; // Skip iteration when index is at currentWord

            const neighbor = input[i];

            // First, compare the distance between the current and neighboring 'word' properties
            const wordDistance = levenshteinEditDistance(currentWord.word, neighbor.word, true);
            if (wordDistance <= distanceThreshold) {
               similarWords.push(neighbor.word);
               continue; // No need to check translations if word is similar
            }

            // Compare the distances between all translations of currentWord and neighbor's
            const currentTranslations = Object.values(currentWord.translations).flat();
            const neighborTranslations = Object.values(neighbor.translations).flat();

            let foundSimilarTranslation = false;

            for (const currentTranslation of currentTranslations) {
               for (const neighborTranslation of neighborTranslations) {
                  const translationDistance = levenshteinEditDistance(currentTranslation, neighborTranslation, true);
                  if (translationDistance <= distanceThreshold) {
                     similarWords.push(neighbor.word);
                     foundSimilarTranslation = true;
                     break;
                  }
               }
               if (foundSimilarTranslation) {
                  break;
               }
            }
         }

         return {
            ...currentWord,
            similar_words: similarWords,
         };
      });
   }
}
