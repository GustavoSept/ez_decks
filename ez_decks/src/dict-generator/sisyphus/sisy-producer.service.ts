import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CreateBatchProcessDto } from '../DTOs/create-batch-process.dto';

@Injectable()
export class SisyProducerService {
   constructor(@InjectQueue('poll') private pollQueue: Queue) {}

   async pollBatchProcess(config: CreateBatchProcessDto) {
      await this.pollQueue.add('pollBatchProcess', config);
   }
}
