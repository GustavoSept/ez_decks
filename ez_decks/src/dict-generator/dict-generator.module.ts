import { Module } from '@nestjs/common';
import { DictGeneratorService } from './dict-generator.service';
import { OpenaiModule } from './openai/openai.module';
import { DictGeneratorController } from './dict-generator.controller';
import { SisyphusModule } from './sisyphus/sisyphus.module';

@Module({
   providers: [DictGeneratorService],
   imports: [OpenaiModule, SisyphusModule],
   controllers: [DictGeneratorController],
})
export class DictGeneratorModule {}
