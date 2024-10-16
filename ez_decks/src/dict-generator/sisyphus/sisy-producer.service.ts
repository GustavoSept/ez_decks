import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CreateBatchProcessDto } from '../DTOs/create-batch-process.dto';
import { BatchResponse } from '../openai/types/batch-result';

@Injectable()
export class SisyProducerService {
   constructor(
      @InjectQueue('poll') private pollQueue: Queue,
      @InjectQueue('dict_to_db') private dictToDbQueue: Queue
   ) {}

   /**
    * Create a batch, keep polling it until we get a `BatchResponse`, process it and stores into the db
    */
   async pollBatchProcess(config: CreateBatchProcessDto) {
      await this.pollQueue.add('pollBatchProcess', config);
   }

   /**
    * Transforms data from `BatchResponse`, and stores it into the db
    */
   async processBatchIntoDb(batchResponse: BatchResponse, batchId: string) {
      await this.dictToDbQueue.add('processBatchIntoDb', { batchResponse, batchId });
   }
}
