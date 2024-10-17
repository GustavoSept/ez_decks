import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OpenaiService } from '../openai/openai.service';
import { DictGeneratorService } from '../dict-generator.service';
import { BatchResponse } from '../openai/types/batch-result';

/**
 * This consumer transforms data from `BatchResponse`, and stores it into the db
 */
@Processor('dict_to_db', {
   concurrency: 1,
   lockDuration: 60_000 * 20 /* 20 minutes */,
})
@Injectable()
export class BatchToDbConsumerService extends WorkerHost {
   private readonly logger = new Logger(BatchToDbConsumerService.name);

   constructor(
      private readonly openaiServ: OpenaiService,
      private readonly dictServ: DictGeneratorService
   ) {
      super();
   }

   async process(job: Job<{ batchResponse: BatchResponse; batchId: string }, any, string>): Promise<void> {
      await this.storeBatchResults(job.data.batchResponse, job.data.batchId);
   }

   /**
    * Retrieve batch results and store them in the database
    */
   private async storeBatchResults(batchResponse: BatchResponse, batchId: string): Promise<void> {
      try {
         const { words, errors } = this.dictServ.extractWordsAndTranslations(batchResponse);

         const processedWords = this.dictServ.processTranslationResponse(words);

         await this.openaiServ.saveBatchResult(processedWords);

         if (errors && errors.length > 0)
            this.logger.error(`Batch ${batchId} produced the following errors:\n${errors}.`);
         this.logger.log(`Batch ${batchId} results stored successfully.`);
      } catch (error) {
         const e = error as Error;
         this.logger.error(`Error while storing results for batch ${batchId}: ${e.message}`);
         throw error;
      }
   }
}
