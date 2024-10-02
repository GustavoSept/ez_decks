import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ZodSchema } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { DEFAULT_MAX_TOKEN_OUTPUT, OPENAI_DEFAULT_FALLBACK_MODEL, OPENAI_SDK } from './constants';
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
      systemMsg: string = 'You are a helpful assistant.',
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
      systemMsg: string = 'You are a helpful assistant.',
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

   async batchQuery(
      inputWords: string[][],
      sysMsg: string,
      model: string = this.configService.get<string>('OPENAI_MODEL', OPENAI_DEFAULT_FALLBACK_MODEL),
      maxTokens: number = DEFAULT_MAX_TOKEN_OUTPUT
   ) {
      const batchUnits: BatchUnit[] = this.batchService.createJSONArrayFromWords(inputWords, sysMsg, model, maxTokens);

      // Create the local JSONL file
      const tempFilePath = await this.batchService.createLocalJSONL(batchUnits);

      try {
         // Stream the file to the OpenAI API
         const req = await this.openai.files.create({
            file: fs.createReadStream(tempFilePath),
            purpose: 'batch',
         });

         return req;
      } finally {
         // Delete the temporary file after the API request
         this.batchService.deleteLocalJSONL(tempFilePath);
      }
   }

   async batchStructuredQuery() {}

   async batchCheckIsReady() {}

   async batchCheckSentBatches() {}
}
