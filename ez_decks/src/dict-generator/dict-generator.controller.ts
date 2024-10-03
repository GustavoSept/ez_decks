import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { OpenaiService } from './openai/openai.service';
import { CreateBatchFileDto } from './DTOs/create-batch-file.dto';
import { TranslationResponse } from './structs/translation-response.zod';

@Controller('dict-generator')
export class DictGeneratorController {
   constructor(private readonly openaiServ: OpenaiService) {}

   @Post('create-batch-file')
   async createBatchFile(@Body() body: CreateBatchFileDto) {
      const file = await this.openaiServ.batchGetFile(body.wordList, body.systemMessage, undefined, undefined, TranslationResponse);
      return file;
   }

   @Post('create-batch-process')
   async createBatchProcess(@Body('inputFileId') inputFileId: string, @Body('metadata') metadata?: Record<string, any>) {
      const batch = await this.openaiServ.batchCreateProcess(inputFileId, undefined, undefined, metadata);
      return batch;
   }

   @Get('batch-status/:batchId')
   async checkBatchStatus(@Param('batchId') batchId: string) {
      const status = await this.openaiServ.batchCheckStatus(batchId);
      return status;
   }

   @Get('batch-results/:batchId')
   async getBatchResults(@Param('batchId') batchId: string) {
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
   async listBatchProcesses(@Query('limit') limit?: number, @Query('after') after?: string) {
      const batches = await this.openaiServ.batchListAllProcesses(limit, after);
      return batches;
   }
}
