import { WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CreateBatchProcessDto } from '../DTOs/create-batch-process.dto';
import { OpenaiService } from '../openai/openai.service';
import { DictGeneratorService } from '../dict-generator.service';

@Injectable()
export class SisyConsumerService extends WorkerHost {
   private readonly logger = new Logger(SisyConsumerService.name);

   constructor(
      private readonly openaiServ: OpenaiService,
      private readonly dictServ: DictGeneratorService
   ) {
      super();
   }

   async process(job: Job<CreateBatchProcessDto, any, string>): Promise<any> {
      const batch = await this.openaiServ.batchCreateProcess(
         job.data.inputFileId,
         undefined,
         undefined,
         job.data.metadata
      );

      const batchId = batch.id;
      this.logger.log(`Batch created with ID: ${batchId}`);

      await this.pollBatchStatus(batchId);
   }

   /**
    * Start polling for the batch status every minute
    */
   private async pollBatchStatus(batchId: string): Promise<void> {
      try {
         const status = await this.openaiServ.batchCheckStatus(batchId);
         this.logger.log(`Polling batch status: ${status.status}`);

         if (
            status.status === 'fail' ||
            status.status === 'failed' ||
            status.status === 'error' ||
            status.status === 'cancelled'
         ) {
            this.logger.error(`Batch ${batchId} failed with status: ${status.status}`);
            // Let the worker die
         } else if (status.status === 'completed') {
            this.logger.log(`Batch ${batchId} completed successfully.`);
            await this.storeBatchResults(batchId);
         } else {
            // Re-poll after 1 minute
            setTimeout(() => this.pollBatchStatus(batchId), 60000);
         }
      } catch (error) {
         const e = error as Error;
         this.logger.error(`Error while polling batch ${batchId}: ${e.message}`);
         // Let the worker die on error
      }
   }

   /**
    * Retrieve batch results and store them in the database
    */
   private async storeBatchResults(batchId: string): Promise<void> {
      try {
         const batchResponse = await this.openaiServ.batchRetrieveResults(batchId);
         const { words, errors } = this.dictServ.extractWordsAndTranslations(batchResponse);

         const processedWords = this.dictServ.processTranslationResponse(words);

         this.openaiServ.saveBatchResult(processedWords);

         if (errors) this.logger.error(`Batch ${batchId} produced the following errors:\n${errors}.`);
         this.logger.log(`Batch ${batchId} results stored successfully.`);
      } catch (error) {
         const e = error as Error;
         this.logger.error(`Error while storing results for batch ${batchId}: ${e.message}`);
      }
   }
}
