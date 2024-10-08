import { Body, Controller, Get, Param, Post, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OpenaiService } from './openai/openai.service';
import { CreateBatchFileDto } from './DTOs/create-batch-file.dto';
import { LoadAndCreateBatchFileDto } from './DTOs/load-and-create-batch-file.dto';
import { CreateBatchProcessDto } from './DTOs/create-batch-process.dto';
import { ListBatchProcessesDto } from './DTOs/list-batch-processes.dto';
import { WesternTranslationResponse } from './structs/translation-response.structs';
import { DictGeneratorService } from './dict-generator.service';
import { BatchResponse } from './openai/types/batch-result';
import { CreatedFileObject } from './openai/types/batch-created-file';
import { BatchProcess } from './openai/types/batch-process';

@Controller('dict-generator')
export class DictGeneratorController {
   constructor(
      private readonly openaiServ: OpenaiService,
      private readonly dictServ: DictGeneratorService
   ) {}

   @Post('create-batch-file')
   async createBatchFile(@Body() body: CreateBatchFileDto): Promise<CreatedFileObject> {
      const file = await this.openaiServ.batchGetFile(
         body.wordList,
         body.systemMessage,
         undefined,
         undefined,
         WesternTranslationResponse,
         undefined,
         body.userMessagePrefix
      );
      return file;
   }

   @Post('load-and-create-batch-file')
   @UseInterceptors(FileInterceptor('wordFile'))
   async loadAndCreateBatchFile(
      @UploadedFile() file: Express.Multer.File,
      @Body() body: LoadAndCreateBatchFileDto
   ): Promise<CreatedFileObject> {
      const wordList = this.dictServ.splitFileIntoBatches(file.buffer); // Convert file to Buffer, then to string[][]
      const batchFile: CreatedFileObject = await this.openaiServ.batchGetFile(
         wordList,
         body.systemMessage,
         undefined,
         undefined,
         WesternTranslationResponse,
         undefined,
         body.userMessagePrefix
      );
      return batchFile;
   }

   @Post('create-batch-process')
   async createBatchProcess(@Body() body: CreateBatchProcessDto): Promise<BatchProcess> {
      const batch = await this.openaiServ.batchCreateProcess(body.inputFileId, undefined, undefined, body.metadata);
      return batch;
   }

   @Get('batch-status/:batchId')
   async checkBatchStatus(@Param('batchId') batchId: string): Promise<BatchProcess> {
      const status = await this.openaiServ.batchCheckStatus(batchId);
      return status;
   }

   @Post('batch-results/:batchId')
   async getBatchResults(@Param('batchId') batchId: string): Promise<BatchResponse & { refusals: string[] }> {
      const { results, errors, refusals } = await this.openaiServ.batchRetrieveResults(batchId);
      // TODO: store result in some database
      console.log({ results, errors, refusals });
      return { results, errors, refusals };
   }

   @Post('batch-cancel/:batchId')
   async cancelBatchProcess(@Param('batchId') batchId: string) {
      const batch = await this.openaiServ.batchCancelProcess(batchId);
      return batch;
   }

   @Get('list-batch-processes')
   async listBatchProcesses(@Query() query: ListBatchProcessesDto): Promise<BatchProcess[]> {
      const batches = await this.openaiServ.batchListAllProcesses(query.limit, query.after);
      return batches;
   }
}
