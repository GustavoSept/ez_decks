import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OpenaiService } from '../openai/openai.service';
import { SisyProducerService } from './sisy-producer.service';
import { WesternTranslationResponseObj } from '../structs/translation-response.structs';
import { BatchProcess } from '../openai/types/batch-process';

@Processor('sequential_batch_processing', {
   concurrency: 1,
   lockDuration: 60_000 * 60 * 24 * 10 /* 10 days */,
})
@Injectable()
export class SequentialBatchProcessingConsumer extends WorkerHost {
   private readonly logger = new Logger(SequentialBatchProcessingConsumer.name);

   constructor(
      private readonly openaiServ: OpenaiService,
      private readonly sisyServ: SisyProducerService
   ) {
      super();
   }

   async process(job: Job) {
      const { batches, sysMsg, userMsgPrefix } = job.data;

      for (const [index, batch] of batches.entries()) {
         try {
            // Upload the batch file to OpenAI
            const batchFile = await this.openaiServ.batchGetFile(
               batch,
               sysMsg,
               undefined,
               undefined,
               WesternTranslationResponseObj,
               undefined,
               userMsgPrefix
            );

            // Create a batch process
            const batchProcess = await this.openaiServ.batchCreateProcess(batchFile.id);

            // Poll the batch status until completion
            const batchId = batchProcess.id;
            this.logger.log(`Batch ${index + 1}/${batches.length} created with ID: ${batchId}`);

            await this.pollBatchUntilComplete(batchId);

            // Retrieve results
            const batchResponse = await this.openaiServ.batchRetrieveResults(batchId);

            // Enqueue job to store results in the database
            await this.sisyServ.enqueueProcessBatchIntoDb(batchResponse, batchId);

            this.logger.log(`Batch ${batchId} enqueued for database insertion.`);

            // Proceed to the next batch without waiting for the DB storage
         } catch (error: any) {
            this.logger.error(`Error processing batch ${index + 1}/${batches.length}: ${error.message}`);
            throw error;
         }
      }
   }

   private async pollBatchUntilComplete(batchId: string) {
      let status: BatchProcess;
      let retries = 5;

      while (true) {
         try {
            status = await this.openaiServ.batchCheckStatus(batchId);
         } catch (error: any) {
            this.logger.error(`Error checking status for batch ${batchId}: ${error.message}`);
            retries--;
            if (retries === 0) {
               throw new Error(`Failed to get status for batch ${batchId} after retries.`);
            }
            await new Promise((resolve) => setTimeout(resolve, 30000));
            continue;
         }

         if (['failed', 'error', 'expired', 'cancelled', 'cancelling'].includes(status.status)) {
            this.logger.error(`Batch ${batchId} failed with status: ${status.status}`);
            throw new Error(`Batch failed with status: ${status.status}`);
         } else if (status.status === 'completed') {
            this.logger.log(`Batch ${batchId} completed successfully.`);
            break;
         } else {
            this.logger.log(
               `Batch ${batchId} status: ${status.status}. ` +
                  `Requests - Total: ${status.request_counts.total}, Completed: ${status.request_counts.completed}, Failed: ${status.request_counts.failed}`
            );
            await new Promise((resolve) => setTimeout(resolve, 30000));
         }
      }
   }
}
