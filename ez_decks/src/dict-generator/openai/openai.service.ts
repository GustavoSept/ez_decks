import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ZodSchema } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { DEFAULT_MAX_TOKEN_OUTPUT, DEFAULT_SYS_MESSAGE, OPENAI_DEFAULT_FALLBACK_MODEL, OPENAI_SDK } from './constants';
import { BatchService } from './batch.service';
import { BatchUnit } from './types';
import * as fs from 'fs';

@Injectable()
export class OpenaiService {
   constructor(
      @Inject(OPENAI_SDK) private readonly openai: OpenAI,
      private readonly configService: ConfigService,
      private readonly batchService: BatchService
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
      structName: string = 'response'
   ) {
      const batchUnits: BatchUnit[] = struct
         ? inputWords.map((words, index) =>
              this.batchService.createBatchUnit(index, words.join(' '), sysMsg, model, maxTokens, false, struct, structName)
           )
         : this.batchService.createJSONArrayFromWords(inputWords, sysMsg, model, maxTokens);

      // Create the local JSONL file
      const tempFilePath = await this.batchService.createLocalJSONL(batchUnits);

      try {
         // Stream the file to the OpenAI API
         const file = await this.openai.files.create({
            file: fs.createReadStream(tempFilePath),
            purpose: 'batch',
         });

         return file;
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
   ) {
      const batch = await this.openai.batches.create({
         input_file_id: inputFileId,
         endpoint: endpoint,
         completion_window: completionWindow,
         metadata: metadata,
      });

      return batch;
   }

   /**
    * Given batch id, check status
    */
   async batchCheckStatus(batchId: string): Promise<OpenAI.Batch> {
      return await this.openai.batches.retrieve(batchId);
   }

   /**
    * Returns the retrieved results
    */
   async batchRetrieveResults(batchId: string): Promise<{ results: object[]; errors: any[] }> {
      const batch = await this.batchCheckStatus(batchId);

      let results: object[] = [];
      if (batch.output_file_id) {
         const fileResponse = await this.openai.files.content(batch.output_file_id);
         const fileContents = await fileResponse.text();

         const lines = fileContents.trim().split('\n');
         results = lines.map((line) => JSON.parse(line));
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
   async batchListAllProcesses(limit?: number, after?: string): Promise<OpenAI.Batch[]> {
      const batches: OpenAI.Batch[] = [];
      const list = await this.openai.batches.list({ limit, after });
      for await (const batch of list) {
         batches.push(batch);
      }
      return batches;
   }
}
