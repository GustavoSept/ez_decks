import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BatchResponse } from '../openai/types/batch-result';
import { OpenAIBatch } from '../openai/types/batch-query';

@Injectable()
export class SisyProducerService {
   constructor(
      @InjectQueue('sequential_batch_processing') private batchQueue: Queue,
      @InjectQueue('dict_to_db') private dictToDbQueue: Queue
   ) {}

   /**
    * Sequentially creates batches, keep polling them until we get a `BatchResponse`, then enqueue `processBatchIntoDb`
    */
   async enqueueSequentialBatchProcessing(config: {
      batches: OpenAIBatch[];
      sysMsg: string;
      userMsgPrefix?: string;
   }) {
      await this.batchQueue.add('processSequentialBatches', config);
   }

   /**
    * Transforms data from `BatchResponse`, and stores it into the db
    */
   async enqueueProcessBatchIntoDb(batchResponse: BatchResponse, batchId: string) {
      await this.dictToDbQueue.add(
         'processBatchIntoDb',
         { batchResponse, batchId },
         { attempts: 4, removeOnFail: 3, removeOnComplete: true }
      );
   }
}
