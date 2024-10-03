import { Body, Controller, Post } from '@nestjs/common';
import { OpenaiService } from './openai/openai.service';
import { CreateBatchFileDto } from './DTOs/create-batch-file.dto';
import { TranslationResponse } from './structs/translation-response.zod';

@Controller('dict-generator')
export class DictGeneratorController {
   constructor(private readonly openaiServ: OpenaiService) {}

   @Post('create-batch-file')
   get_batch_file(@Body() body: CreateBatchFileDto) {
      const file = this.openaiServ.batchGetFile(body.wordList, body.systemMessage, undefined, undefined, TranslationResponse);
      return file;
   }
}
