import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { CreateBatchFileDto } from '../src/dict-generator/DTOs/create-batch-file.dto';
import request from 'supertest';

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
               systemMessage: "You're a helpful assistant", // Default value
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
});
