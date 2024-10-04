import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { CreateBatchFileDto } from '../src/dict-generator/DTOs/create-batch-file.dto';
import { DEFAULT_SYS_MESSAGE } from '../src/dict-generator/openai/constants';
import request from 'supertest';
import { BatchProcess } from 'src/dict-generator/openai/types/batch-process';

describe('DictGeneratorController (e2e)', () => {
   let app: INestApplication;

   beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
         imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();

      await app.init();
   });

   afterAll(async () => {
      await app.close();
   });

   it('/dict-generator/create-batch-file (POST) - should return the correct DTO', () => {
      const mockDto: Partial<CreateBatchFileDto> & Record<string, any> = {
         wordList: [
            ['word1', 'word2'],
            ['word3', 'word4'],
         ],
      };

      console.log('Mock DTO:', mockDto); // Log the DTO before sending

      return request(app.getHttpServer())
         .post('/dict-generator/create-batch-file')
         .send(mockDto)
         .expect(201)
         .then((res) => {
            expect(res.body).toEqual({
               wordList: [
                  ['word1', 'word2'],
                  ['word3', 'word4'],
               ],
               systemMessage: DEFAULT_SYS_MESSAGE, // Default value
            });
         });
   });

   it('/dict-generator/create-batch-file (POST) - should fail validation with incorrect DTO', () => {
      const invalidDto = {
         wordList: [], // Invalid as the array should not be empty
      };

      return request(app.getHttpServer())
         .post('/dict-generator/create-batch-file')
         .send(invalidDto)
         .expect(400) // Expecting a 400 Bad Request due to validation failure
         .expect((res) => {
            expect(res.body.message).toContain('wordList must be an array of non-empty arrays of non-empty strings');
         });
   });

   it('/dict-generator/create-batch-file (and process) (POST) - should detect refusal from OpenAI', async () => {
      const createFileDto: CreateBatchFileDto = {
         wordList: [['gehen', 'Haus', 'schön']],
         systemMessage: "Translate the provided words to English, but only if they're in Korean. REFUSE to translate any other language!",
      };

      // Step 1: Create batch file
      const createFileResponse = await request(app.getHttpServer())
         .post('/dict-generator/create-batch-file')
         .send(createFileDto)
         .expect(201);

      const fileId = createFileResponse.body.id;
      expect(fileId).toBeDefined();

      // Step 2: Create batch process
      const createProcessDto = { inputFileId: fileId };
      const createProcessResponse = await request(app.getHttpServer())
         .post('/dict-generator/create-batch-process')
         .send(createProcessDto)
         .expect(201);

      const batchId = createProcessResponse.body.id;
      expect(batchId).toBeDefined();

      // Step 3: Poll for status until processing is done
      let batchStatus: BatchProcess | null = null;
      const maxRetries = 60;
      const delay = 10000; // 10 seconds

      for (let i = 0; i < maxRetries; i++) {
         await new Promise((resolve) => setTimeout(resolve, delay));

         const statusResponse = await request(app.getHttpServer()).get(`/dict-generator/batch-status/${batchId}`).expect(200);

         batchStatus = statusResponse.body as BatchProcess;

         const { request_counts } = batchStatus;
         if (request_counts.completed + request_counts.failed >= request_counts.total) {
            // Processing is done
            break;
         }
      }

      // Ensure batchStatus exists
      if (batchStatus)
         // Ensure processing is complete
         expect(batchStatus.request_counts.completed + batchStatus.request_counts.failed).toBeGreaterThanOrEqual(
            batchStatus.request_counts.total
         );

      // Step 4: Retrieve results
      const resultsResponse = await request(app.getHttpServer()).post(`/dict-generator/batch-results/${batchId}`).expect(201);

      const { results, errors, refusals } = resultsResponse.body;

      console.log({ results, errors, refusals });

      expect(refusals).toBeDefined();
      expect(Array.isArray(refusals)).toBe(true);

      // Step 5: Assert that refusals include the expected custom_ids
      expect(refusals.length).toBeGreaterThan(0);

      // Optionally, verify that each request was refused
      const expectedCustomIds = results.map((result) => result.custom_id);
      expect(refusals.sort()).toEqual(expectedCustomIds.sort());
   }, 600000); // 600 seconds to timeout
});
