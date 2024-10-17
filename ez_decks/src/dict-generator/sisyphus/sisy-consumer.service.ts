import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CreateBatchProcessDto } from '../DTOs/create-batch-process.dto';
import { OpenaiService } from '../openai/openai.service';
import { DictGeneratorService } from '../dict-generator.service';

@Processor('poll', { concurrency: 1, lockDuration: 60_000 * 61 * 24 /* 24 hours and 24 minutes */ })
@Injectable()
export class SisyConsumerService extends WorkerHost {
   private readonly logger = new Logger(SisyConsumerService.name);

   constructor(
      private readonly openaiServ: OpenaiService,
      private readonly dictServ: DictGeneratorService
   ) {
      super();
   }

   async process(job: Job<CreateBatchProcessDto, any, string>): Promise<void> {
      await this.processBatch(job);
   }

   private async processBatch(job: Job<CreateBatchProcessDto, any, string>): Promise<void> {
      const batch = await this.openaiServ.batchCreateProcess(
         job.data.inputFileId,
         undefined,
         undefined,
         job.data.metadata
      );

      const batchId = batch.id;
      this.logger.log(`Batch created with ID: ${batchId}`);

      await this.pollBatchStatus(batchId, undefined);
   }

   /**
    * Start polling for the batch status every minute
    */
   private async pollBatchStatus(batchId: string, retry: number = 5): Promise<void> {
      if (retry === 0) {
         return;
      }

      try {
         const status = await this.openaiServ.batchCheckStatus(batchId);
         this.logger.log(
            `Polling batch status: ${status.status}. Requests - Total: ${status.request_counts.total}, Completed: ${status.request_counts.completed}, Failed: ${status.request_counts.failed} | Batch_id: ${status.id}`
         );

         if (
            status.errors && // If there's an error
            !(Array.isArray(status.errors.object) && status.errors.object.length === 0) && // and it's not an empty array
            !(status.errors.object.constructor === Object && Object.keys(status.errors.object).length === 0) // nor is it an empty object
         ) {
            this.logger.error(`An error occurred when processing batch (). Error: ${status.errors}`);
            return;
         }

         switch (status.status) {
            case 'failed':
            case 'error':
            case 'expired':
            case 'cancelled':
            case 'cancelling':
               this.logger.error(`Batch ${batchId} failed with status: ${status.status}`);
               // Let the worker die
               break;
            case 'completed':
               this.logger.log(`Batch ${batchId} completed successfully.`);
               await this.storeBatchResults(batchId);
               break;
            case 'validating':
            case 'in_progress':
            case 'finalizing':
               // Re-poll after 30 seconds
               setTimeout(() => this.pollBatchStatus(batchId, retry), 30000);
               break;
            default:
               this.logger.warn(`Batch ${batchId} has an unknown status: ${status.status}`);
               // Re-poll after 30 seconds
               setTimeout(() => this.pollBatchStatus(batchId, retry - 1), 5000);
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
