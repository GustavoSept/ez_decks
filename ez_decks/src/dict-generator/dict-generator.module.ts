import { Module } from '@nestjs/common';
import { DictGeneratorService } from './dict-generator.service';
import { OpenaiModule } from './openai/openai.module';

@Module({
   providers: [DictGeneratorService],
   imports: [OpenaiModule],
})
export class DictGeneratorModule {}
