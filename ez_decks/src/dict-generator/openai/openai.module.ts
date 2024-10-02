import { Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { OpenAIProvider } from './providers';
import { BatchService } from './batch.service';

@Module({
   providers: [OpenaiService, OpenAIProvider, BatchService],
   exports: [OpenaiService],
})
export class OpenaiModule {}
