import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_MAX_TOKEN_OUTPUT, OPENAI_DEFAULT_FALLBACK_MODEL } from './constants';
import { BatchUnit } from './types';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BatchService {
   constructor(private readonly configService: ConfigService) {}

   /**
    * returns a single line from .jsonl "file"/stream
    */
   createBatchUnit(
      id: number,
      userMsg: string,
      systemMsg: string = 'You are a helpful assistant.',
      model: string = this.configService.get<string>('OPENAI_MODEL', OPENAI_DEFAULT_FALLBACK_MODEL),
      maxTokens: number = DEFAULT_MAX_TOKEN_OUTPUT,
      suppressWarning: boolean = false
   ): BatchUnit {
      if (!Number.isInteger(id)) {
         if (!suppressWarning) console.warn(`ID must be an integer, but received: ${id}. Truncating variable to get a valid id.`);
         id = Math.trunc(id);
      }
      return {
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
