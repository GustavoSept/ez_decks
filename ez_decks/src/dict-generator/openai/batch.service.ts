import { Injectable, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_MAX_TOKEN_OUTPUT, DEFAULT_SYS_MESSAGE, DEFAULT_USER_MESSAGE_PREFIX, OPENAI_DEFAULT_FALLBACK_MODEL } from './constants';
import { BatchUnit } from './types/batch-unit';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ZodSchema } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { OpenAIBatch } from './types/batch-query';

@Injectable()
export class BatchService {
   constructor(private readonly configService: ConfigService) {}

   /**
    * returns a single line from .jsonl "file"/stream
    */
   createBatchUnit<T>(
      id: number,
      userMsg: string,
      systemMsg: string = DEFAULT_SYS_MESSAGE,
      model: string = this.configService.get<string>('OPENAI_MODEL', OPENAI_DEFAULT_FALLBACK_MODEL),
      maxTokens: number = DEFAULT_MAX_TOKEN_OUTPUT,
      suppressWarning: boolean = false,
      struct?: ZodSchema<T>,
      structName: string = 'response'
   ): BatchUnit {
      if (!Number.isInteger(id)) {
         if (!suppressWarning) console.warn(`ID must be an integer, but received: ${id}. Truncating variable to get a valid id.`);
         id = Math.trunc(id);
      }

      const batchUnit: BatchUnit = {
         custom_id: `request-${id}`,
         method: 'POST',
         url: '/v1/chat/completions',
         body: {
            model: model,
            messages: [
               { role: 'system', content: systemMsg },
               { role: 'user', content: userMsg },
            ],
            max_tokens: Math.trunc(maxTokens),
         },
      };

      if (struct) {
         batchUnit.body['response_format'] = zodResponseFormat(struct, structName);
      }

      return batchUnit;
   }

   /**
    * Generates a BatchUnit[] representing the .jsonl
    */
   createJSONArrayFromWords(
      inputWords: OpenAIBatch['arrays'],
      userMsgPrefix: string = DEFAULT_USER_MESSAGE_PREFIX,
      sysMsg: string,
      model: string = this.configService.get<string>('OPENAI_MODEL', OPENAI_DEFAULT_FALLBACK_MODEL),
      maxTokens: number = DEFAULT_MAX_TOKEN_OUTPUT
   ): BatchUnit[] {
      const JSONL_Array: BatchUnit[] = [];

      for (let i = 0; i < inputWords.length; i++) {
         const wordList = inputWords[i].join(', ');
         const userMsg = `${userMsgPrefix}${wordList}`;

         const batchUnit: BatchUnit = this.createBatchUnit(i + 1, userMsg, sysMsg, model, maxTokens);
         JSONL_Array.push(batchUnit);
      }

      return JSONL_Array;
   }

   /**
    * Generates a BatchUnit[] (with structured return) representing the .jsonl
    */
   createJSONArrayFromWordsWithStruct<T>(
      inputWords: OpenAIBatch['arrays'],
      userMsgPrefix: string = DEFAULT_USER_MESSAGE_PREFIX,
      sysMsg: string,
      model: string,
      maxTokens: number,
      struct: ZodSchema<T>,
      structName: string
   ): BatchUnit[] {
      console.log('running createJSONArrayFromWordsWithStruct()');
      return inputWords.map((words, index) =>
         this.createBatchUnit(index, `${userMsgPrefix}` + words.join(' '), sysMsg, model, maxTokens, false, struct, structName)
      );
   }

   /**
    * Create a temporary local .jsonl file and write the JSONL content into it
    *
    * Returns path of the local file
    */
   async createLocalJSONL(batchUnits: BatchUnit[]): Promise<string> {
      // Check total number of batch units (current limit: 50,000)
      // https://platform.openai.com/docs/guides/batch/rate-limits
      const MAX_BATCH_UNITS = 50_000;
      if (batchUnits.length > MAX_BATCH_UNITS) {
         throw new PayloadTooLargeException(`Exceeded maximum batch units limit of ${MAX_BATCH_UNITS}. Received ${batchUnits.length}.`);
      }

      return new Promise((resolve, reject) => {
         const tempFilePath = path.join(this.configService.get<string>('NODE_TEMP_PATH', '/tmp'), `${uuidv4()}.jsonl`);
         const writeStream = fs.createWriteStream(tempFilePath);

         let totalSizeInBytes = 0;

         const MAX_SIZE_IN_BYTES = Math.max(100 * 1024 * 1024, 0) - 256; // 100 MB - 256 bytes

         writeStream.on('error', (err) => reject(err));
         writeStream.on('finish', () => resolve(tempFilePath));

         for (const unit of batchUnits) {
            const unitString = JSON.stringify(unit) + '\n';
            const unitSizeInBytes = Buffer.byteLength(unitString, 'utf8');

            totalSizeInBytes += unitSizeInBytes;
            if (totalSizeInBytes > MAX_SIZE_IN_BYTES) {
               writeStream.end(); // Ensure the stream is closed
               reject(new PayloadTooLargeException(`Exceeded maximum batch file size of 100 MB.`));
               return;
            }

            writeStream.write(unitString);
         }

         writeStream.end();
      });
   }

   /**
    * Deletes the temporary local file
    */
   deleteLocalJSONL(filePath: string): void {
      fs.unlinkSync(filePath);
   }
}
