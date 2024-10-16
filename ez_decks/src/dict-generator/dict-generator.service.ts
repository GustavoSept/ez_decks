import { Injectable } from '@nestjs/common';
import { levenshteinEditDistance } from '../common/utils/levenshtein-edit-distance';
import { BatchResponse, BatchResult } from './openai/types/batch-result';
import { OpenAIBatch } from './openai/types/batch-query';
import {
   ErrorInfo,
   ProcessedTranslationResponse,
   GenericTranslationShape,
   WesternTranslationResponse,
} from './structs/translation-response.structs';
import fs from 'node:fs';

@Injectable()
export class DictGeneratorService {
   /**
    * Splits the content of a .txt file into an array of `OpenAIBatch`.
    * Each `OpenAIBatch` contain an array of arrays, each containing up to wordCapacity elements.
    */
   splitFileIntoBatches(
      fileContent: Buffer,
      wordCapacity: number = 8,
      maxBatchSize: number = 50_000
   ): OpenAIBatch[] {
      // Convert buffer to string and split by new lines
      const lines = fileContent
         .toString('utf-8')
         .split(/\r?\n/) // Split by line-break (\r is windows-specific and optional, \n is global)
         .filter((line) => line.trim() !== '');

      const result: OpenAIBatch[] = [];
      let currentBatch: OpenAIBatch = { arrays: [] };

      for (let i = 0; i < lines.length; i += wordCapacity) {
         const batch = lines.slice(i, i + wordCapacity);
         currentBatch.arrays.push(batch);

         // If the current batch reaches maxBatches size, push it to result and create a new batch
         if (currentBatch.arrays.length === maxBatchSize) {
            result.push(currentBatch);
            currentBatch = { arrays: [] };
         }
      }

      // Push the remaining batch if it's not empty
      if (currentBatch.arrays.length > 0) {
         result.push(currentBatch);
      }

      return result;
   }

   /**
    * Extracts the primary_language words and their translations from the batch response.
    */
   extractWordsAndTranslations(batchResponse: BatchResponse): {
      words: WesternTranslationResponse;
      errors: ErrorInfo[];
   } {
      const words: WesternTranslationResponse = [];
      const errors: ErrorInfo[] = [];

      batchResponse.results.forEach((result) => {
         try {
            if (result.error) {
               errors.push(this.extractErrorInfo(result));
            } else if (result.response.body.choices[0].message.refusal) {
               errors.push(this.extractRefusalInfo(result));
            } else {
               words.push(...this.extractValidWords(result));
            }
         } catch {} // Skip problematic strings, if parsing fails
      });

      return { words, errors };
   }

   /**
    * Extracts valid primary_language words and translations from a batch result.
    */
   private extractValidWords(result: BatchResult): WesternTranslationResponse {
      const messageContent = result.response.body.choices[0].message.content;
      let parsedContent: { response: WesternTranslationResponse };

      try {
         parsedContent = JSON.parse(messageContent);
      } catch (error: any) {
         const sanitizedMessageContent = messageContent.replace(/[\n\t\r\v\f\u0009 ]/g, '');
         console.info(`Error parsing messageContent: ${sanitizedMessageContent}. Error: ${error.message}`);

         // TODO: make a more scalable solution to automatically reprocess missed words
         fs.writeFileSync('missed_words.txt', sanitizedMessageContent, { flag: 'a+' });

         throw new Error('Error parsing BatchResult');
      }

      return parsedContent.response;
   }

   /**
    * Extracts error information from a batch result.
    */
   private extractErrorInfo(result: BatchResult): ErrorInfo {
      return {
         custom_id: result.custom_id,
         type: 'error',
         error: result.error,
      };
   }

   /**
    * Extracts refusal information from a batch result.
    */
   private extractRefusalInfo(result: BatchResult): ErrorInfo {
      return {
         custom_id: result.custom_id,
         type: 'refusal',
         error: result.response.body.choices[0].message.refusal,
      };
   }

   /**
    * Gathers `similar_words` and `grammar_categories` fields for each word.
    * Removes words which all translations are identical to the word itself (acronyms, proper nouns), or contain no translations
    *
    * - `similar_words` is based on the Levenshtein edit distance between the word and its neighbors.
    *   The distance check is applied both to the words themselves and their translations. If the
    *   distance is less than or equal to the `distanceThreshold`, the word is considered similar.
    *
    * - `grammar_categories` is derived by inspecting the `translations` of each word. The keys
    *   (which represent grammatical categories) of any non-empty translation record are collected.
    *
    * @param input Some `WesternTranslationResponse` input
    * @param distanceThreshold Match definition: any word pair with distance <= distanceThreshold
    * @param maxNeighbours word amount to run the algorithm on (in each direction)
    */
   processTranslationResponse<T extends GenericTranslationShape>(
      input: T[],
      distanceThreshold: number = 3,
      maxNeighbours: number = 50
   ): ProcessedTranslationResponse<T>[] {
      return input.reduce<ProcessedTranslationResponse<T>[]>((acc, currentWord, index, arr) => {
         const currentTranslations = Object.values(currentWord.translations).flat();
         const hasDifferentTranslation = currentTranslations.some(
            (translation) => translation !== currentWord.word
         );

         if (!hasDifferentTranslation) {
            return acc; // Skip this word if all translations are identical to the word itself (acronyms, proper nouns), or there are no translations
         }

         const similarWords: string[] = [];
         const grammarCategories: string[] = [];

         // Determine the range of neighboring words to consider
         const start = Math.max(0, index - maxNeighbours);
         const end = Math.min(arr.length, index + maxNeighbours + 1);

         for (let i = start; i < end; i++) {
            if (i === index) continue; // Skip iteration when index is at currentWord

            const neighbor = arr[i];

            // Compare the distance between the current and neighboring 'word' properties
            const wordDistance = levenshteinEditDistance(currentWord.word, neighbor.word, true);
            if (wordDistance <= distanceThreshold) {
               similarWords.push(neighbor.word);
               continue; // No need to check translations if word is similar
            }

            // Compare the distances between all translations of currentWord and neighbor's
            const neighborTranslations = Object.values(neighbor.translations).flat();

            let foundSimilarTranslation = false;

            for (const currentTranslation of currentTranslations) {
               for (const neighborTranslation of neighborTranslations) {
                  const translationDistance = levenshteinEditDistance(
                     currentTranslation,
                     neighborTranslation,
                     true
                  );
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

         // Gather grammar categories by checking non-empty translation records
         for (const [category, translations] of Object.entries(currentWord.translations)) {
            if (translations.length > 0) {
               grammarCategories.push(category);
            }
         }

         acc.push({
            ...currentWord,
            similar_words: similarWords,
            grammar_categories: grammarCategories,
         });

         return acc;
      }, []);
   }
}
