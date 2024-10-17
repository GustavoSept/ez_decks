import { Module } from '@nestjs/common';
import { SisyProducerService } from './sisy-producer.service';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SisyConsumerService } from './sequential-batch-processing.consumer';
import { OpenaiModule } from '../openai/openai.module';
import { DictGeneratorService } from '../dict-generator.service';
import { BatchToDbConsumerService } from './batchtodb-consumer.service';

/**
 * This module is used to long-poll openAI, get results, store on db, repeat.
 * Since it's a repetitive task, I've called it sisyphus.
 */
@Module({
   imports: [
      BullModule.forRootAsync({
         imports: [ConfigModule],
         inject: [ConfigService],
         useFactory: (configService: ConfigService) => ({
            connection: {
               host: 'queue',
               port: configService.get<number>('REDIS_PORT'),
            },
         }),
      }),
      BullModule.registerQueue(
         {
            name: 'poll',
         },
         {
            name: 'dict_to_db',
         }
      ),
      OpenaiModule,
   ],
   providers: [SisyProducerService, SisyConsumerService, BatchToDbConsumerService, DictGeneratorService],
   exports: [SisyProducerService],
})
export class SisyphusModule {}
