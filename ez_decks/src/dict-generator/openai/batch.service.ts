import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_MAX_TOKEN_OUTPUT, DEFAULT_SYS_MESSAGE, OPENAI_DEFAULT_FALLBACK_MODEL } from './constants';
import { BatchUnit } from './types';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ZodSchema } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

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
      inputWords: string[][],
      sysMsg: string,
      model: string = this.configService.get<string>('OPENAI_MODEL', OPENAI_DEFAULT_FALLBACK_MODEL),
      maxTokens: number = DEFAULT_MAX_TOKEN_OUTPUT
   ): BatchUnit[] {
      const JSONL_Array: BatchUnit[] = [];

      for (let i = 0; i < inputWords.length; i++) {
         const wordList = inputWords[i].join(', ');
         const userMsg = `Translate the following words: ${wordList}`;

         const batchUnit: BatchUnit = this.createBatchUnit(i + 1, userMsg, sysMsg, model, maxTokens);
         JSONL_Array.push(batchUnit);
      }

      return JSONL_Array;
   }

   /**
    * Create a temporary local .jsonl file and write the JSONL content into it
    *
    * Returns path of the local file
    */
   async createLocalJSONL(batchUnits: BatchUnit[]): Promise<string> {
      return new Promise((resolve, reject) => {
         const tempFilePath = path.join(this.configService.get<string>('NODE_TEMP_PATH', '/tmp'), `${uuidv4()}.jsonl`);
         const writeStream = fs.createWriteStream(tempFilePath);

         writeStream.on('error', (err) => reject(err));
         writeStream.on('finish', () => resolve(tempFilePath));

         batchUnits.forEach((unit) => {
            writeStream.write(JSON.stringify(unit) + '\n');
         });

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
