import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OpenaiService } from '../openai/openai.service';
import { DictGeneratorService } from '../dict-generator.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * This consumer manually processes and stores words extracted from local files.
 */
@Processor('manual_store_words', {
   concurrency: 1,
   lockDuration: 60_000 * 6 /* 6 minutes */,
})
@Injectable()
export class ManualStoreWordsConsumerService extends WorkerHost {
   private readonly logger = new Logger(ManualStoreWordsConsumerService.name);

   constructor(
      private readonly openaiServ: OpenaiService,
      private readonly dictServ: DictGeneratorService
   ) {
      super();
   }

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   async process(job: Job<{ local_file_path?: string }>): Promise<void> {
      console.log('Got here without errors!');
      await this.storeWordsFromFiles(job.data.local_file_path);
   }

   /**
    * Retrieve words from local files and store them in the database
    */
   private async storeWordsFromFiles(local_file_path?: string): Promise<void> {
      const suffix_file_path = local_file_path ?? '/01_german_job/batches_output';

      try {
         const baseDirectory = path.join(__dirname, '../../../../local_files' + suffix_file_path);
         const files = fs.readdirSync(baseDirectory).filter((file) => {
            const filePath = path.join(baseDirectory, file);
            return fs.statSync(filePath).isFile();
         });

         for (let i = 0; i < files.length; i += 5) {
            const fileBatch = files.slice(i, i + 5);

            await Promise.all(
               fileBatch.map(async (file) => {
                  this.logger.log(`processing file: ${file}...`);

                  const filePath = path.join(baseDirectory, file);
                  const fileContent = fs.readFileSync(filePath, 'utf-8');

                  const words = fileContent
                     .split('\n')
                     .filter((line) => line.trim()) // ignoring empty lines
                     .map((line) => JSON.parse(line)); // parsing each line as JSON

                  const processedWords = this.dictServ.processTranslationResponse(words);
                  await this.openaiServ.saveBatchResult(processedWords); // enqueueing save operation for each file
               })
            );
         }

         this.logger.log('All words from files stored successfully.');
      } catch (error) {
         const e = error as Error;
         this.logger.error(`Error while storing words from files: ${e.message}`);
         throw error;
      }
   }
}
