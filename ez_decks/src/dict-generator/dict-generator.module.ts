import { Module } from '@nestjs/common';
import { DictGeneratorService } from './dict-generator.service';
import { OpenaiModule } from './openai/openai.module';
import { DictGeneratorController } from './dict-generator.controller';

@Module({
   providers: [DictGeneratorService],
   imports: [OpenaiModule],
   controllers: [DictGeneratorController],
})
export class DictGeneratorModule {}
