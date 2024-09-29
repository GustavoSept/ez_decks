import { Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { OpenAIProvider } from './providers';

@Module({
   providers: [OpenaiService, OpenAIProvider],
})
export class OpenaiModule {}
