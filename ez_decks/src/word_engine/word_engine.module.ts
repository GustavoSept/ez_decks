import { Module } from '@nestjs/common';
import { WordEngineService } from './word_engine.service';

@Module({
   providers: [WordEngineService],
})
export class WordEngineModule {}
