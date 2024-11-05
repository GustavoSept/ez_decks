import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ZodSchema } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import * as fs from 'fs';
import {
   DEFAULT_MAX_TOKEN_OUTPUT,
   DEFAULT_SYS_MESSAGE,
   OPENAI_DEFAULT_FALLBACK_MODEL,
   OPENAI_SDK,
} from './constants';
import { BatchService } from './batch.service';
import { BatchUnit } from './types/batch-unit';
import { BatchResponse, BatchResult } from './types/batch-result';
import { CreatedFileObject } from './types/batch-created-file';
import { BatchProcess } from './types/batch-process';
import {
   GenericTranslationShape,
   ProcessedTranslationResponse,
} from '../structs/translation-response.structs';
import { mapStringToGrammarType } from '../../prisma/utils/grammar-type-conversion';
import { PrismaService } from '../../prisma/prisma.service';
import { Language } from '../../prisma/language.enum';
import { OpenAIBatch } from './types/batch-query';
import { Prisma } from '@prisma/client';

@Injectable()
export class OpenaiService {
   private readonly logger = new Logger(OpenaiService.name);
   constructor(
      @Inject(OPENAI_SDK) private readonly openai: OpenAI,
      private readonly configService: ConfigService,
      private readonly batchService: BatchService,
      private readonly prisma: PrismaService
   ) {}

   async query(
      userMsg: string,
      systemMsg: string = DEFAULT_SYS_MESSAGE,
      maxOutput: number = DEFAULT_MAX_TOKEN_OUTPUT,
      model: string = this.configService.get<string>('OPENAI_MODEL', OPENAI_DEFAULT_FALLBACK_MODEL)
   ): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
      const completion = await this.openai.chat.completions.create({
         model: model,
         messages: [
            { role: 'system', content: systemMsg },
            {
               role: 'user',
               content: userMsg,
            },
         ],
         max_completion_tokens: maxOutput,
      });

      return completion.choices[0].message;
   }

   async structuredQuery<T>(
      userMsg: string,
      struct: ZodSchema<T>,
      structName: string = 'response',
      systemMsg: string = DEFAULT_SYS_MESSAGE,
      maxOutput: number = DEFAULT_MAX_TOKEN_OUTPUT,
      model: string = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini')
   ): Promise<T> {
      const completion = await this.openai.beta.chat.completions.parse({
         model: model,
         messages: [
            { role: 'system', content: systemMsg },
            {
               role: 'user',
               content: userMsg,
            },
         ],
         max_completion_tokens: maxOutput,
         response_format: zodResponseFormat(struct, structName),
      });

      return completion.choices[0].message.parsed as T;
   }

   /**
    * Upload file to OpenAI (we can use the id to batch process later)
    */
   async batchGetFile<T>(
      inputWords: OpenAIBatch,
      sysMsg: string,
      model: string = this.configService.get<string>('OPENAI_MODEL', OPENAI_DEFAULT_FALLBACK_MODEL),
      maxTokens: number = DEFAULT_MAX_TOKEN_OUTPUT,
      struct?: ZodSchema<T>,
      structName: string = 'response',
      userMsgPrefix?: string
   ): Promise<CreatedFileObject> {
      const batchUnits: BatchUnit[] = struct
         ? this.batchService.createJSONArrayFromWordsWithStruct(
              inputWords.arrays,
              userMsgPrefix,
              sysMsg,
              model,
              maxTokens,
              struct,
              structName
           )
         : this.batchService.createJSONArrayFromWords(
              inputWords.arrays,
              userMsgPrefix,
              sysMsg,
              model,
              maxTokens
           );

      // Create the local JSONL file
      const tempFilePath = await this.batchService.createLocalJSONL(batchUnits);

      try {
         // Stream the file to the OpenAI API
         const file = await this.openai.files.create({
            file: fs.createReadStream(tempFilePath),
            purpose: 'batch',
         });

         return file as unknown as Promise<CreatedFileObject>;
      } finally {
         // Delete the temporary file after the API request
         this.batchService.deleteLocalJSONL(tempFilePath);
      }
   }

   /**
    * Start batch processing
    */
   async batchCreateProcess(
      inputFileId: string,
      endpoint: '/v1/chat/completions' | '/v1/embeddings' | '/v1/completions' = '/v1/chat/completions',
      completionWindow: '24h' = '24h',
      metadata?: Record<string, any>
   ): Promise<BatchProcess> {
      const batch = await this.openai.batches.create({
         input_file_id: inputFileId,
         endpoint: endpoint,
         completion_window: completionWindow,
         metadata: metadata,
      });

      return batch as unknown as Promise<BatchProcess>;
   }

   /**
    * Given batch id, check status
    */
   async batchCheckStatus(batchId: string): Promise<BatchProcess> {
      return (await this.openai.batches.retrieve(batchId)) as unknown as Promise<BatchProcess>;
   }

   /**
    * Returns the retrieved results
    */
   async batchRetrieveResults(batchId: string): Promise<BatchResponse> {
      const batch = await this.batchCheckStatus(batchId);

      let results: BatchResult[] = [];

      if (batch.output_file_id) {
         const fileResponse = await this.openai.files.content(batch.output_file_id);
         const fileContents = await fileResponse.text();

         const lines = fileContents.trim().split('\n');
         results = lines
            .map((line) => {
               try {
                  return JSON.parse(line) as BatchResult;
               } catch (error: any) {
                  const sanitizedLine = line.replace(/[\n\t\r\v\f\u0009 ]/g, '');
                  this.logger.log('Failed to parse error line:', sanitizedLine, error.message);

                  // TODO: make a more scalable solution to automatically reprocess missed words
                  fs.writeFileSync('logs/missed_words.txt', sanitizedLine + '\n', { flag: 'a+' });

                  return null;
               }
            })
            .filter((result) => result !== null); // Remove any lines that couldn't be parsed
      }

      let errors: object[] = [];
      if (batch.error_file_id) {
         const errorFileResponse = await this.openai.files.content(batch.error_file_id);
         const errorFileContents = await errorFileResponse.text();

         const errorLines = errorFileContents.trim().split('\n');
         errors = errorLines
            .map((line) => {
               try {
                  return JSON.parse(line);
               } catch (error: any) {
                  const sanitizedLine = line.replace(/[\n\t\r\v\f\u0009 ]/g, '');
                  this.logger.log('Failed to parse error line:', sanitizedLine, error.message);

                  // TODO: make a more scalable solution to automatically reprocess missed words
                  fs.writeFileSync('logs/missed_words.txt', sanitizedLine + '\n', { flag: 'a+' });

                  return null;
               }
            })
            .filter((error) => error !== null); // Remove any lines that couldn't be parsed
      }

      return { results, errors };
   }

   /**
    * Given batch id, cancel processing
    */
   async batchCancelProcess(batchId: string): Promise<OpenAI.Batch> {
      const batch = await this.openai.batches.cancel(batchId);
      return batch;
   }

   /**
    * Returns a list of every sent OpenAI batch
    */
   async batchListAllProcesses(limit?: number, after?: string): Promise<BatchProcess[]> {
      const batches: OpenAI.Batch[] = [];
      const list = await this.openai.batches.list({ limit, after });
      for await (const batch of list) {
         batches.push(batch);
      }
      return batches as unknown as Promise<BatchProcess[]>;
   }

   /**
    * Saves any `GenericTranslationShape` into the database.
    * Internally, it saves words in chunks, to optimize performance.
    * @param processedWords A `BatchResult` after it's processed.
    * @param primary_language The language of each 'word' key
    * @param secondary_language The language each 'word' is translated to
    */
   async saveBatchResult<T extends GenericTranslationShape>(
      processedWords: ProcessedTranslationResponse<T>[],
      primary_language: Language = Language.German,
      secondary_language: Language = Language.English
   ) {
      const startTime = process.hrtime();
      this.logger.debug('Starting to save batch result into database...');
      // console.log(`BEFORE PROCESSING: ${JSON.stringify(processedWords)}`);

      // Step 1: Clean input
      const cleanedWords = this.cleanProcessedTranslationResponse<T>(processedWords);

      // console.log(`AFTER PROCESSING: ${JSON.stringify(cleanedWords)}`);

      // Step 2: Insert new words synchronously, row by row
      for (const newWord of cleanedWords) {
         try {
            await this.prisma.word.upsert({
               where: {
                  primary_language_word: {
                     word: newWord.word,
                     primary_language: primary_language,
                  },
               },
               update: {}, // No update needed since we just want to ignore existing entries
               create: {
                  word: newWord.word,
                  primary_language: primary_language,
               },
            });
         } catch (error: any) {
            if (error.code === 'P2002') {
               // Log unique constraint violation error
               fs.writeFileSync(
                  'logs/unique_constraint_error.txt',
                  JSON.stringify(newWord) + ' (from wordsToProcess) \n',
                  {
                     flag: 'a+',
                  }
               );
            } else {
               throw error; // Re-throw if it's a different error
            }
         }
      }

      // Step 3: Fetch all words again to get complete wordId mapping
      const allWordsMap = new Map<string, number>();

      const allWords = await this.prisma.word.findMany({
         where: {
            primary_language: primary_language,
            word: {
               in: cleanedWords.map((word) => word.word),
            },
         },
      });

      for (const word of allWords) {
         allWordsMap.set(word.word, word.id);
      }

      // console.debug('All words map keys:', [...allWordsMap.keys()]);

      // Step 4: Prepare batch data for translations, similar words, and grammar categories
      const translationsToInsert: Prisma.TranslationCreateManyInput[] = [];
      const similarWordsToInsert: Prisma.SimilarWordCreateManyInput[] = [];
      const grammarCategoriesToInsert: Prisma.GrammarCategoryCreateManyInput[] = [];

      for (const cleanWord of cleanedWords) {
         const wordId = allWordsMap.get(cleanWord.word);
         if (wordId) {
            // Translations
            for (const [type, translationList] of Object.entries(cleanWord.translations)) {
               const grammarType = mapStringToGrammarType(type);
               for (const translation of translationList) {
                  translationsToInsert.push({
                     wordId: wordId,
                     secondary_language: secondary_language,
                     type: grammarType,
                     translation: translation,
                  });
               }
            }

            // Similar Words
            for (const similarWord of cleanWord.similar_words) {
               const similarWordId = allWordsMap.get(similarWord);
               if (similarWordId) {
                  similarWordsToInsert.push({
                     wordId: wordId,
                     similar_word: similarWordId,
                  });
               }
            }

            // Grammar Categories
            for (const grammarCategory of cleanWord.grammar_categories) {
               const grammarType = mapStringToGrammarType(grammarCategory);
               grammarCategoriesToInsert.push({
                  wordId: wordId,
                  category: grammarType,
               });
            }
         }
      }

      // Step 5: Insert translations, similar words, and grammar categories synchronously, row by row

      for (const translation of translationsToInsert) {
         try {
            await this.prisma.translation.create({
               data: translation,
            });
         } catch (error: any) {
            if (error.code === 'P2002') {
               fs.writeFileSync(
                  'logs/unique_constraint_error.txt',
                  JSON.stringify(translation) + ' (from translationsToInsert) \n',
                  {
                     flag: 'a+',
                  }
               );
            } else {
               throw error; // Re-throw if it's a different error
            }
         }
      }

      for (const similarWord of similarWordsToInsert) {
         try {
            await this.prisma.similarWord.create({
               data: similarWord,
            });
         } catch (error: any) {
            if (error.code === 'P2002') {
               fs.writeFileSync(
                  'logs/unique_constraint_error.txt',
                  JSON.stringify(similarWord) + ' (from similarWordsToInsert) \n',
                  {
                     flag: 'a+',
                  }
               );
            } else {
               throw error; // Re-throw if it's a different error
            }
         }
      }

      for (const grammarCategory of grammarCategoriesToInsert) {
         try {
            await this.prisma.grammarCategory.create({
               data: grammarCategory,
            });
         } catch (error: any) {
            if (error.code === 'P2002') {
               fs.writeFileSync(
                  'logs/unique_constraint_error.txt',
                  JSON.stringify(grammarCategory) + ' (from grammarCategoriesToInsert) \n',
                  {
                     flag: 'a+',
                  }
               );
            } else {
               throw error; // Re-throw if it's a different error
            }
         }
      }

      const diff = process.hrtime(startTime);
      const timeTaken = diff[0] + diff[1] / 1e9; // Converts time to seconds
      this.logger.debug(`Finished saving batch result into database! Took ${timeTaken.toFixed(2)} seconds!`);
   }

   /**
    * Runs .trim() and toLowerCase() on all strings
    *
    * Also removes duplicated rows based on "word"
    */
   cleanProcessedTranslationResponse<T extends GenericTranslationShape>(
      processedWords: ProcessedTranslationResponse<T>[]
   ) {
      const wordsToProcess = processedWords.map((pw) => ({
         word: pw.word.trim().toLowerCase(),
         translations: Object.fromEntries(
            Object.entries(pw.translations).map(([key, value]) => [
               key.trim().toLowerCase(),
               Array.from(new Set(value.map((v) => v.trim().toLowerCase()))),
            ])
         ),
         similar_words: Array.from(new Set(pw.similar_words.map((s) => s.trim().toLowerCase()))),
         grammar_categories: Array.from(new Set(pw.grammar_categories.map((g) => g.trim().toLowerCase()))),
      }));

      const uniqueWordsToProcess = Array.from(
         new Map(wordsToProcess.map((item) => [item.word, item])).values()
      );
      return uniqueWordsToProcess;
   }
}
