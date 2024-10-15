import { Body, Controller, Get, Param, Post, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OpenaiService } from './openai/openai.service';
import { CreateBatchFileDto } from './DTOs/create-batch-file.dto';
import { LoadAndCreateBatchFileDto } from './DTOs/load-and-create-batch-file.dto';
import { ListBatchProcessesDto } from './DTOs/list-batch-processes.dto';
import { WesternTranslationResponseObj } from './structs/translation-response.structs';
import { DictGeneratorService } from './dict-generator.service';
import { CreatedFileObject } from './openai/types/batch-created-file';
import { BatchProcess } from './openai/types/batch-process';
import { SisyProducerService } from './sisyphus/sisy-producer.service';

@Controller('dict-generator')
export class DictGeneratorController {
   constructor(
      private readonly openaiServ: OpenaiService,
      private readonly dictServ: DictGeneratorService,
      private readonly sisyServ: SisyProducerService
   ) {}

   /**
    * Creates an 'OpenAI batch file' based on text input
    */
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

   /**
    * Creates an 'OpenAI batch file' based on the uploaded file
    */
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

   /**
    * Based on the uploaded file:
    *
    * - Creates batches
    * - Waits for the results of each batch
    * - Process and save results into db
    */
   @Post('load-and-process-file')
   @UseInterceptors(FileInterceptor('wordFile'))
   async loadAndProcessFile(
      @UploadedFile() file: Express.Multer.File,
      @Body() body: LoadAndCreateBatchFileDto
   ): Promise<{ processingFileIds: string[] }> {
      const batches = this.dictServ.splitFileIntoBatches(file.buffer, body.wordCapacity, body.maxBatchSize); // Convert file to Buffer, then to string[][]

      const processingFileIds: string[] = [];

      for (const batch of batches) {
         const batchFile: CreatedFileObject = await this.openaiServ.batchGetFile(
            batch,
            body.systemMessage,
            undefined,
            undefined,
            WesternTranslationResponseObj,
            undefined,
            body.userMessagePrefix
         );

         this.sisyServ.pollBatchProcess({ inputFileId: batchFile.id });

         processingFileIds.push(batchFile.id);
      }
      return { processingFileIds: processingFileIds };
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
