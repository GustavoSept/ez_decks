import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DEFAULT_SYS_MESSAGE } from './constants';
import { BatchService } from './batch.service';
import { BatchUnit } from './types/batch-unit';
import * as fs from 'fs';
import { z } from 'zod';

describe('BatchService', () => {
   let service: BatchService;
   let configService: ConfigService;

   const batchUnits: BatchUnit[] = [
      {
         custom_id: 'request-1',
         method: 'POST',
         url: '/v1/chat/completions',
         body: {
            model: 'gpt-3.5-turbo-0125',
            messages: [
               { role: 'system', content: DEFAULT_SYS_MESSAGE },
               { role: 'user', content: 'Hello world!' },
            ],
            max_tokens: 1000,
         },
      },
      {
         custom_id: 'request-2',
         method: 'POST',
         url: '/v1/chat/completions',
         body: {
            model: 'gpt-3.5-turbo-0125',
            messages: [
               { role: 'system', content: 'You are an unhelpful assistant.' },
               { role: 'user', content: 'Hello world!' },
            ],
            max_tokens: 1000,
         },
      },
   ];

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         imports: [
            ConfigModule.forRoot({
               isGlobal: true,
               envFilePath: [`.env.${process.env.NODE_ENV || 'development'}.local`, '.env'],
               expandVariables: true,
            }),
         ],
         providers: [BatchService],
      }).compile();

      service = module.get<BatchService>(BatchService);
      configService = module.get<ConfigService>(ConfigService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('createBatchUnit', () => {
      it('should create a valid BatchUnit', () => {
         const id = 1;
         const userMsg = 'Test message';
         const systemMsg = DEFAULT_SYS_MESSAGE;
         const model = configService.get<string>('OPENAI_MODEL') || 'gpt-3';
         const maxTokens = 100;

         const batchUnit = service.createBatchUnit(id, userMsg, systemMsg, model, maxTokens);

         expect(batchUnit).toEqual({
            custom_id: `request-${id}`,
            method: 'POST',
            url: '/v1/chat/completions',
            body: {
               model: model,
               messages: [
                  { role: 'system', content: systemMsg },
                  { role: 'user', content: userMsg },
               ],
               max_tokens: maxTokens,
            },
         });
      });

      it('should truncate the ID if it is not an integer', () => {
         const id = 1.5;
         const batchUnit = service.createBatchUnit(id, 'Test message', undefined, undefined, undefined, true);

         expect(batchUnit.custom_id).toBe('request-1');
      });

      it('should use default system message and model if not provided', () => {
         const id = 1;
         const userMsg = 'Test message';

         const batchUnit = service.createBatchUnit(id, userMsg);

         expect(batchUnit.body.messages[0].content).toBe(DEFAULT_SYS_MESSAGE);
         expect(batchUnit.body.model).toBe(configService.get('OPENAI_MODEL', 'gpt-3'));
      });

      it('should include response_format when struct is provided', () => {
         const id = 1;
         const userMsg = 'Test message';
         const systemMsg = 'Test system message';
         const model = 'gpt-3';
         const maxTokens = 100;

         const responseSchema = z.object({
            text: z.string(),
         });

         const batchUnit = service.createBatchUnit(id, userMsg, systemMsg, model, maxTokens, false, responseSchema, 'custom_response');

         expect(batchUnit.body).toHaveProperty('response_format');
         expect(batchUnit.body.response_format).toMatchObject({
            type: 'json_schema',
            json_schema: {
               name: 'custom_response',
               schema: {
                  $schema: 'http://json-schema.org/draft-07/schema#',
                  additionalProperties: false,
                  properties: {
                     text: { type: 'string' },
                  },
                  required: ['text'],
                  type: 'object',
               },
            },
         });
      });

      it('should not include response_format when struct is not provided', () => {
         const id = 1;
         const userMsg = 'Test message';
         const systemMsg = 'Test system message';
         const model = 'gpt-3';
         const maxTokens = 100;

         const batchUnit = service.createBatchUnit(id, userMsg, systemMsg, model, maxTokens);

         expect(batchUnit.body).not.toHaveProperty('response_format');
      });

      it('should allow custom structName for response_format', () => {
         const id = 1;
         const userMsg = 'Test message';
         const systemMsg = 'Test system message';
         const model = 'gpt-3';
         const maxTokens = 100;

         const responseSchema = z.object({
            text: z.string(),
         });

         const customStructName = 'custom_response';

         const batchUnit = service.createBatchUnit(id, userMsg, systemMsg, model, maxTokens, false, responseSchema, customStructName);

         expect(batchUnit.body.response_format.json_schema.name).toBe(customStructName);
      });
   });

   describe('createJSONArrayFromWords', () => {
      it('should create an array of BatchUnits from input words', () => {
         const inputWords = [
            ['hello', 'world'],
            ['foo', 'bar'],
         ];
         const sysMsg = 'Test system message';
         const model = configService.get<string>('OPENAI_MODEL') || 'gpt-3';
         const maxTokens = 100;

         const batchUnits = service.createJSONArrayFromWords(inputWords, sysMsg, model, maxTokens);

         expect(batchUnits.length).toBe(2);
         expect(batchUnits[0].body.messages[1].content).toBe('Translate the following words: hello, world');
         expect(batchUnits[1].body.messages[1].content).toBe('Translate the following words: foo, bar');
      });
   });

   describe('createLocalJSONL and deleteLocalJSONL', () => {
      it('should create a local temp JSONL file and write batch units to it', async () => {
         const tempFilePath = await service.createLocalJSONL(batchUnits);

         // Check if the file was created
         const fileExists = fs.existsSync(tempFilePath);
         expect(fileExists).toBe(true);

         // Read and verify file content
         const fileContent = fs.readFileSync(tempFilePath, 'utf8').split('\n').filter(Boolean);
         expect(fileContent.length).toBe(2);
         expect(JSON.parse(fileContent[0])).toEqual(batchUnits[0]);
         expect(JSON.parse(fileContent[1])).toEqual(batchUnits[1]);

         // Clean up by deleting the file
         fs.unlinkSync(tempFilePath);

         // Ensure file is deleted
         const fileStillExists = fs.existsSync(tempFilePath);
         expect(fileStillExists).toBe(false);
      });
   });
});
