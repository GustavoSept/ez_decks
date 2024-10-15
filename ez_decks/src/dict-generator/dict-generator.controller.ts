import { Body, Controller, Get, Param, Post, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OpenaiService } from './openai/openai.service';
import { CreateBatchFileDto } from './DTOs/create-batch-file.dto';
import { LoadAndCreateBatchFileDto } from './DTOs/load-and-create-batch-file.dto';
import { CreateBatchProcessDto } from './DTOs/create-batch-process.dto';
import { ListBatchProcessesDto } from './DTOs/list-batch-processes.dto';
import { WesternTranslationResponseObj } from './structs/translation-response.structs';
import { DictGeneratorService } from './dict-generator.service';
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
         { arrays: body.wordList },
         body.systemMessage,
         undefined,
         undefined,
         WesternTranslationResponseObj,
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
   ): Promise<CreatedFileObject[]> {
      const wordList = this.dictServ.splitFileIntoBatches(file.buffer, body.wordCapacity, body.maxBatchSize); // Convert file to Buffer, then to string[][]

      const createdFiles: CreatedFileObject[] = [];

      for (const batch of wordList) {
         const batchFile: CreatedFileObject = await this.openaiServ.batchGetFile(
            batch,
            body.systemMessage,
            undefined,
            undefined,
            WesternTranslationResponseObj,
            undefined,
            body.userMessagePrefix
         );

         createdFiles.push(batchFile);
      }
      return createdFiles;
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
   async getBatchResults(@Param('batchId') batchId: string) {
      const batchResponse = await this.openaiServ.batchRetrieveResults(batchId);

      const { words, errors } = this.dictServ.extractWordsAndTranslations(batchResponse);

      const processedWords = this.dictServ.processTranslationResponse(words);

      this.openaiServ.saveBatchResult(processedWords);
      return { processedWords, errors };
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
