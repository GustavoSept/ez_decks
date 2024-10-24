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
import { chunkArray } from '../../common/utils/array/chunk-array';

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
                  console.info('Failed to parse error line:', sanitizedLine, error.message);

                  // TODO: make a more scalable solution to automatically reprocess missed words
                  fs.writeFileSync('missed_words.txt', sanitizedLine + '\n', { flag: 'a+' });

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
                  console.info('Failed to parse error line:', sanitizedLine, error.message);

                  // TODO: make a more scalable solution to automatically reprocess missed words
                  fs.writeFileSync('missed_words.txt', sanitizedLine + '\n', { flag: 'a+' });

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

      // Step 1: Collect all unique words
      const wordsToProcess = processedWords.map((pw) => ({
         word: pw.word,
         primary_language: primary_language,
      }));

      // NOTE: Needs to be below the limit of the db's bind variables
      const chunkSize = 16384;

      // Step 2: Fetch existing words in chunks
      const existingWordsMap = new Map<string, number>();

      const wordChunks = chunkArray(
         wordsToProcess.map((w) => w.word),
         chunkSize
      );

      for (const wordChunk of wordChunks) {
         const existingWords = await this.prisma.word.findMany({
            where: {
               word: { in: wordChunk },
               primary_language: primary_language,
            },
         });

         for (const word of existingWords) {
            existingWordsMap.set(word.word, word.id);
         }
      }

      // Step 3: Identify new words to insert
      const newWords = wordsToProcess.filter((w) => !existingWordsMap.has(w.word));

      // Step 4: Insert new words in chunks
      if (newWords.length > 0) {
         const newWordChunks = chunkArray(newWords, chunkSize);

         for (const newWordChunk of newWordChunks) {
            await this.prisma.word.createMany({
               data: newWordChunk,
            });
         }
      }

      // Step 5: Fetch all words again to get complete wordId mapping
      const allWordsMap = new Map<string, number>();

      for (const wordChunk of wordChunks) {
         const allWords = await this.prisma.word.findMany({
            where: {
               word: { in: wordChunk },
               primary_language: primary_language,
            },
         });

         for (const word of allWords) {
            allWordsMap.set(word.word, word.id);
         }
      }

      // Step 6: Prepare batch data for translations, similar words, and grammar categories
      const translationsToInsert: Prisma.TranslationCreateManyInput[] = [];
      const similarWordsToInsert: Prisma.SimilarWordCreateManyInput[] = [];
      const grammarCategoriesToInsert: Prisma.GrammarCategoryCreateManyInput[] = [];

      for (const processedWord of processedWords) {
         const wordId = allWordsMap.get(processedWord.word);
         if (wordId) {
            // Translations
            for (const [type, translationList] of Object.entries(processedWord.translations)) {
               const grammarType = mapStringToGrammarType(type);
               for (const translation of translationList) {
                  translationsToInsert.push({
                     wordId: wordId,
                     primary_language: primary_language,
                     secondary_language: secondary_language,
                     type: grammarType,
                     translation: translation,
                  });
               }
            }

            // Similar Words
            for (const similarWord of processedWord.similar_words) {
               similarWordsToInsert.push({
                  wordId: wordId,
                  primary_language: primary_language,
                  similarWord: similarWord,
               });
            }

            // Grammar Categories
            for (const grammarCategory of processedWord.grammar_categories) {
               const grammarType = mapStringToGrammarType(grammarCategory);
               grammarCategoriesToInsert.push({
                  wordId: wordId,
                  primary_language: primary_language,
                  secondary_language: secondary_language,
                  category: grammarType,
               });
            }
         }
      }

      // Step 7: Batch insert translations, similar words, and grammar categories in chunks
      // Adjust chunk sizes as needed to stay within the bind variable limit
      const translationChunks = chunkArray(translationsToInsert, chunkSize);
      for (const translationChunk of translationChunks) {
         await this.prisma.translation.createMany({
            data: translationChunk,
         });
      }

      const similarWordsChunks = chunkArray(similarWordsToInsert, chunkSize);
      for (const similarWordsChunk of similarWordsChunks) {
         await this.prisma.similarWord.createMany({
            data: similarWordsChunk,
         });
      }

      const grammarCategoriesChunks = chunkArray(grammarCategoriesToInsert, chunkSize);
      for (const grammarCategoriesChunk of grammarCategoriesChunks) {
         await this.prisma.grammarCategory.createMany({
            data: grammarCategoriesChunk,
         });
      }
      const diff = process.hrtime(startTime);
      const timeTaken = diff[0] + diff[1] / 1e9; // Converts time to seconds
      this.logger.debug(`Finished saving batch result into database! Took ${timeTaken.toFixed(2)} seconds!`);
   }
}
