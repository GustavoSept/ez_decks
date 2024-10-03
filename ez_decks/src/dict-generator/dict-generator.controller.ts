import { Body, Controller, Post } from '@nestjs/common';
import { OpenaiService } from './openai/openai.service';
import { CreateBatchFileDto } from './DTOs/create-batch-file.dto';

@Controller('dict-generator')
export class DictGeneratorController {
   constructor(private readonly openaiServ: OpenaiService) {}

   @Post('create-batch-file')
   get_batch_file(@Body() body: CreateBatchFileDto) {
      // file = this.openaiServ.batchGetFile(body.wordList,)
      console.log('Incoming Body:', body);
      return body;
   }
}
