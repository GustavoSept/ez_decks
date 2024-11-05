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
import fs from 'fs';
import path from 'path';

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
    * Synchronously processes batches based on the uploaded file:
    *
    * - Creates batches
    * - Waits for the results of each batch before proceeding to the next one
    * - Process and save results into db
    */
   @Post('load-and-process-file')
   @UseInterceptors(FileInterceptor('wordFile'))
   async loadAndProcessFile(
      @UploadedFile() file: Express.Multer.File,
      @Body() body: LoadAndCreateBatchFileDto
   ): Promise<{ message: string }> {
      const batches = this.dictServ.splitFileIntoBatches(file.buffer, body.wordCapacity, body.maxBatchSize);

      this.logger.log(`Request generated ${batches.length} batches. Enqueuing for processing...`);

      await this.sisyServ.enqueueSequentialBatchProcessing({
         batches,
         sysMsg: body.systemMessage,
         userMsgPrefix: body.userMessagePrefix,
      });

      return { message: 'Batch processing started.' };
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

   /**
    * Manually save the contents of extracted batchIds into multiple batchResponses
    * @param batchIds A json value with a list of batchIds
    * @returns Creates files (on dist/local_files) with the content
    */
   @Post('batch-results/manual-save-words')
   async saveBatchWords(@Body('batch_ids') batchIds: string[]) {
      const baseDirectory = path.join(__dirname, '../local_files/01_german_job/batches_output');

      // Ensure the directory exists
      if (!fs.existsSync(baseDirectory)) {
         fs.mkdirSync(baseDirectory, { recursive: true });
      }

      console.log(baseDirectory);

      // Find the largest numbered file in the directory
      const existingFiles = fs
         .readdirSync(baseDirectory)
         .filter((file) => file.startsWith('batch_') && file.endsWith('.txt'));

      let maxNumber = 0;
      for (const file of existingFiles) {
         const match = file.match(/batch_(\d+)\.txt/);
         if (match) {
            const number = parseInt(match[1], 10);
            if (number > maxNumber) {
               maxNumber = number;
            }
         }
      }

      // Iterate over each batchId, retrieve words and save them to a new file
      for (const batchId of batchIds) {
         const batchResponse = await this.openaiServ.batchRetrieveResults(batchId);
         const { words } = this.dictServ.extractWordsAndTranslations(batchResponse);

         const newFileName = `batch_${String(maxNumber + 1).padStart(2, '0')}.txt`;
         const filePath = path.join(baseDirectory, newFileName);
         fs.writeFileSync(filePath, words.map((word) => JSON.stringify(word)).join('\n'));
         maxNumber++;
      }

      return { message: 'Words saved successfully' };
   }

   /**
    * Manually store the contents of extracted words saved in local_files
    */
   @Post('batch-results/manual-store-words')
   async storeBatchWords(@Query('local_file_path') localFilePath?: string) {
      this.sisyServ.enqueueProcessWordsIntoDb(localFilePath);

      return { message: 'Words are being processed...' };
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
