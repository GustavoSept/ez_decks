import { Body, Controller, Get, Param, Post, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OpenaiService } from './openai/openai.service';
import { CreateBatchFileDto } from './DTOs/create-batch-file.dto';
import { LoadAndCreateBatchFileDto } from './DTOs/load-and-create-batch-file.dto';
import { CreateBatchProcessDto } from './DTOs/create-batch-process.dto';
import { ListBatchProcessesDto } from './DTOs/list-batch-processes.dto';
import { TranslationResponse } from './structs/translation-response.zod';
import { DictGeneratorService } from './dict-generator.service';
import { BatchResponse } from './openai/types';

@Controller('dict-generator')
export class DictGeneratorController {
   constructor(
      private readonly openaiServ: OpenaiService,
      private readonly dictServ: DictGeneratorService
   ) {}

   @Post('create-batch-file')
   async createBatchFile(@Body() body: CreateBatchFileDto) {
      const file = await this.openaiServ.batchGetFile(body.wordList, body.systemMessage, undefined, undefined, TranslationResponse);
      return file;
   }

   @Post('load-and-create-batch-file')
   @UseInterceptors(FileInterceptor('wordFile'))
   async loadAndCreateBatchFile(@UploadedFile() file: Express.Multer.File, @Body() body: LoadAndCreateBatchFileDto) {
      const wordList = this.dictServ.splitFileIntoBatches(file.buffer); // Convert file to Buffer, then to string[][]
      const batchFile = await this.openaiServ.batchGetFile(wordList, body.systemMessage, undefined, undefined, TranslationResponse);
      return batchFile;
   }

   @Post('create-batch-process')
   async createBatchProcess(@Body() body: CreateBatchProcessDto) {
      const batch = await this.openaiServ.batchCreateProcess(body.inputFileId, undefined, undefined, body.metadata);
      return batch;
   }

   @Get('batch-status/:batchId')
   async checkBatchStatus(@Param('batchId') batchId: string) {
      const status = await this.openaiServ.batchCheckStatus(batchId);
      return status;
   }

   @Post('batch-results/:batchId')
   async getBatchResults(@Param('batchId') batchId: string): Promise<BatchResponse> {
      const { results, errors } = await this.openaiServ.batchRetrieveResults(batchId);
      // TODO: store result in some database
      return { results, errors };
   }

   @Post('batch-cancel/:batchId')
   async cancelBatchProcess(@Param('batchId') batchId: string) {
      const batch = await this.openaiServ.batchCancelProcess(batchId);
      return batch;
   }

   @Get('list-batch-processes')
   async listBatchProcesses(@Query() query: ListBatchProcessesDto) {
      const batches = await this.openaiServ.batchListAllProcesses(query.limit, query.after);
      return batches;
   }
}
