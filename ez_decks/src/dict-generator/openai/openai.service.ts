import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ZodSchema } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import * as fs from 'fs';
import { DEFAULT_MAX_TOKEN_OUTPUT, DEFAULT_SYS_MESSAGE, OPENAI_DEFAULT_FALLBACK_MODEL, OPENAI_SDK } from './constants';
import { BatchService } from './batch.service';
import { BatchUnit } from './types/batch-unit';
import { BatchResponse, BatchResult } from './types/batch-result';
import { CreatedFileObject } from './types/batch-created-file';
import { BatchProcess } from './types/batch-process';
import { GenericTranslationShape, ProcessedTranslationResponse } from '../structs/translation-response.structs';
import { mapStringToGrammarType } from '../../prisma/utils/grammar-type-conversion';
import { PrismaService } from '../../prisma/prisma.service';
import { Language } from '../../prisma/language.enum';

@Injectable()
export class OpenaiService {
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
      inputWords: string[][],
      sysMsg: string,
      model: string = this.configService.get<string>('OPENAI_MODEL', OPENAI_DEFAULT_FALLBACK_MODEL),
      maxTokens: number = DEFAULT_MAX_TOKEN_OUTPUT,
      struct?: ZodSchema<T>,
      structName: string = 'response',
      userMsgPrefix?: string
   ): Promise<CreatedFileObject> {
      const batchUnits: BatchUnit[] = struct
         ? this.batchService.createJSONArrayFromWordsWithStruct(inputWords, userMsgPrefix, sysMsg, model, maxTokens, struct, structName)
         : this.batchService.createJSONArrayFromWords(inputWords, userMsgPrefix, sysMsg, model, maxTokens);

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
         results = lines.map((line) => JSON.parse(line)) as BatchResult[];
      }

      let errors: object[] = [];
      if (batch.error_file_id) {
         const errorFileResponse = await this.openai.files.content(batch.error_file_id);
         const errorFileContents = await errorFileResponse.text();

         const errorLines = errorFileContents.trim().split('\n');
         errors = errorLines.map((line) => JSON.parse(line));
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

   async saveBatchResult<T extends GenericTranslationShape>(
      processedWords: ProcessedTranslationResponse<T>[],
      primary_language: Language = Language.German,
      secondary_language: Language = Language.English
   ) {
      for (const processedWord of processedWords) {
         const { word, translations, similar_words, grammar_categories } = processedWord;

         // Step 1: Save or find the Word
         let wordEntry = await this.prisma.word.findFirst({
            where: {
               word: word,
               primary_language: primary_language,
            },
         });

         if (!wordEntry) {
            wordEntry = await this.prisma.word.create({
               data: {
                  word: word,
                  language: {
                     connect: { id: primary_language },
                  },
               },
            });
         } else {
            continue; // Skip already registered words [may happen due to LLM error]
         }

         const wordId = wordEntry.id;

         // Step 2: Save translations
         for (const [type, translationList] of Object.entries(translations)) {
            const grammarType = mapStringToGrammarType(type);
            for (const translation of translationList) {
               await this.prisma.translation.create({
                  data: {
                     wordId: wordId,
                     primary_language: primary_language,
                     secondary_language: secondary_language,
                     type: grammarType,
                     translation: translation,
                  },
               });
            }
         }

         // Step 3: Save similar words
         for (const similarWord of similar_words) {
            await this.prisma.similarWord.create({
               data: {
                  wordId: wordId,
                  primary_language: primary_language,
                  similarWord: similarWord,
               },
            });
         }

         // Step 4: Save grammar categories
         for (const grammarCategory of grammar_categories) {
            const grammarType = mapStringToGrammarType(grammarCategory);
            await this.prisma.grammarCategory.create({
               data: {
                  wordId: wordId,
                  primary_language: primary_language,
                  secondary_language: secondary_language,
                  category: grammarType,
               },
            });
         }
      }
   }
}
