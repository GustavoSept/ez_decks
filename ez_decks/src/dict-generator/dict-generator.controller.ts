import {
   Body,
   Controller,
   Get,
   Param,
   Post,
   Query,
   UseInterceptors,
   UploadedFile,
   Logger,
} from '@nestjs/common';
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
import { CreateBatchProcessDto } from './DTOs/create-batch-process.dto';

@Controller('dict-generator')
export class DictGeneratorController {
   private readonly logger = new Logger(DictGeneratorController.name);
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

   /**
    * Synchronously processes batches based on the uploaded file:
    *
    * - Creates batches
    * - Waits for the results of each batch before proceeding to the next one
    * - Process and save results into db
    */
   @Post('load-and-process-file-sync')
   @UseInterceptors(FileInterceptor('wordFile'))
   async loadAndProcessFileSync(
      @UploadedFile() file: Express.Multer.File,
      @Body() body: LoadAndCreateBatchFileDto
   ): Promise<{ processingFileIds: string[] }> {
      const batches = this.dictServ.splitFileIntoBatches(file.buffer, body.wordCapacity, body.maxBatchSize);
      const processingFileIds: string[] = [];

      this.logger.log(`Request generated ${batches.length} batches. Starting to process...`);

      for (const [index, batch] of batches.entries()) {
         const batchFile: CreatedFileObject = await this.openaiServ.batchGetFile(
            batch,
            body.systemMessage,
            undefined,
            undefined,
            WesternTranslationResponseObj,
            undefined,
            body.userMessagePrefix
         );

         const batchProcess = await this.openaiServ.batchCreateProcess(
            batchFile.id,
            undefined,
            undefined,
            undefined
         );

         // Wait for batch processing to complete synchronously
         const batchId = batchProcess.id;
         this.logger.log(`Batch ${index + 1}/${batches.length} created with ID: ${batchId}`);

         let status: BatchProcess;
         let retries: number = 5;
         while (true) {
            try {
               status = await this.openaiServ.batchCheckStatus(batchId);
            } catch (error: any) {
               this.logger.error(`Error while checking status for batch ${batchId}: ${error.message}`);
               retries--;
               if (retries === 0) {
                  throw new Error(`Failed to get status for batch ${batchId} after retries.`);
               }
               await new Promise((resolve) => setTimeout(resolve, 30000));
               continue;
            }
            switch (status.status) {
               case 'failed':
               case 'error':
               case 'expired':
               case 'cancelled':
               case 'cancelling':
                  this.logger.error(`Batch ${batchId} failed with status: ${status.status}`);
                  throw new Error(`Batch failed with status: ${status.status}`);
               case 'completed':
                  this.logger.log(`Batch ${batchId} completed successfully.`);
                  break;
               case 'validating':
               case 'in_progress':
               case 'finalizing':
                  this.logger.log(
                     `Polling batch status: ${status.status}. Requests - Total: ${status.request_counts.total}, Completed: ${status.request_counts.completed}, Failed: ${status.request_counts.failed} | Batch_id: ${status.id}`
                  );
                  break;
               default:
                  this.logger.warn(`Batch ${batchId} has an unknown status: ${status.status}`);
                  retries--;
            }

            if (status.status === 'completed' || retries === 0) {
               break;
            }

            await new Promise((resolve) => setTimeout(resolve, 30000));
         }

         if (!status || status.status !== 'completed') {
            throw new Error(`Batch ${batchId} did not complete successfully after retries.`);
         }

         // Store results synchronously
         const batchResponse = await this.openaiServ.batchRetrieveResults(batchId);
         this.sisyServ.processBatchIntoDb(batchResponse, batchId);
         processingFileIds.push(batchId);
      }
      return { processingFileIds: processingFileIds };
   }

   @Post('create-batch-process')
   async createBatchProcess(@Body() body: CreateBatchProcessDto): Promise<BatchProcess> {
      const batch = await this.openaiServ.batchCreateProcess(
         body.inputFileId,
         undefined,
         undefined,
         body.metadata
      );
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
