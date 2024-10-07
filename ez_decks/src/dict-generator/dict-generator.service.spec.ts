import { Test, TestingModule } from '@nestjs/testing';
import { DictGeneratorService } from './dict-generator.service';
import { BatchResponse } from './openai/types/batch-result';
import * as fs from 'fs';
import path from 'path';

describe('DictGeneratorService', () => {
   let service: DictGeneratorService;

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [DictGeneratorService],
      }).compile();

      service = module.get<DictGeneratorService>(DictGeneratorService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('splitFileIntoBatches()', () => {
      it('should split file content into batches', () => {
         const fileContent = Buffer.from('line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10');
         const batchSize = 8;
         const result = service.splitFileIntoBatches(fileContent, batchSize);

         expect(result).toEqual([
            ['line1', 'line2', 'line3', 'line4', 'line5', 'line6', 'line7', 'line8'],
            ['line9', 'line10'],
         ]);
      });

      it('should handle files with less than batch size lines', () => {
         const fileContent = Buffer.from('line1\nline2\nline3\nline4');
         const batchSize = 8;
         const result = service.splitFileIntoBatches(fileContent, batchSize);

         expect(result).toEqual([['line1', 'line2', 'line3', 'line4']]);
      });

      it('should handle empty file content', () => {
         const fileContent = Buffer.from('');
         const batchSize = 8;
         const result = service.splitFileIntoBatches(fileContent, batchSize);

         expect(result).toEqual([]);
      });

      it('should handle malformed file content (empty lines, blank lines)', () => {
         const fileContent = Buffer.from('line1\nline2\nline3\nline4\nline5\n\n\n   \nline6\nline7\nline8\nline9\nline10');
         const batchSize = 8;
         const result = service.splitFileIntoBatches(fileContent, batchSize);

         expect(result).toEqual([
            ['line1', 'line2', 'line3', 'line4', 'line5', 'line6', 'line7', 'line8'],
            ['line9', 'line10'],
         ]);
      });
   });

   describe('extractWordsAndTranslations()', () => {
      it('should extract words and translations from batch response', () => {
         const fileContent = fs.readFileSync(path.join(__dirname, 'test', '200_word_output.txt'), 'utf8');

         const batchResponse: BatchResponse = JSON.parse(fileContent);
         const result = service.extractWordsAndTranslations(batchResponse);

         expect(result.words.length).toBeGreaterThan(0);
         expect(result.errors.length).toBe(0);
         expect(result.words[0]).toHaveProperty('german_word');
         expect(result.words[0]).toHaveProperty('translations');
      });

      it('should handle batch response with errors', () => {
         const batchResponse: BatchResponse = {
            results: [
               {
                  id: 'batch_req_1',
                  custom_id: 'request-1',
                  response: {
                     status_code: 400,
                     request_id: 'error-request',
                     body: {
                        id: '',
                        object: '',
                        created: 0,
                        model: '',
                        choices: [],
                        usage: {
                           prompt_tokens: 0,
                           completion_tokens: 0,
                           total_tokens: 0,
                           prompt_tokens_details: { cached_tokens: 0, reasoning_tokens: 0 },
                           completion_tokens_details: { cached_tokens: 0, reasoning_tokens: 0 },
                        },
                        system_fingerprint: '',
                     },
                  },
                  error: { message: 'An error occurred' },
               },
            ],
            errors: [],
         };

         const result = service.extractWordsAndTranslations(batchResponse);

         expect(result.words.length).toBe(0);
         expect(result.errors.length).toBe(1);
         expect(result.errors[0]).toHaveProperty('custom_id', 'request-1');
         expect(result.errors[0]).toHaveProperty('error');
      });

      it('should handle batch response with refusals', () => {
         const batchResponse: BatchResponse = {
            results: [
               {
                  id: 'batch_req_2',
                  custom_id: 'request-2',
                  response: {
                     status_code: 200,
                     request_id: 'refusal-request',
                     body: {
                        id: 'chatcmpl-refusal',
                        object: 'chat.completion',
                        created: 1728035274,
                        model: 'gpt-4o-mini-2024-07-18',
                        choices: [
                           {
                              index: 0,
                              message: {
                                 role: 'assistant',
                                 content: '{}',
                                 refusal: { reason: 'Refusal reason' },
                              },
                              logprobs: null,
                              finish_reason: 'stop',
                           },
                        ],
                        usage: {
                           prompt_tokens: 0,
                           completion_tokens: 0,
                           total_tokens: 0,
                           prompt_tokens_details: { cached_tokens: 0, reasoning_tokens: 0 },
                           completion_tokens_details: { cached_tokens: 0, reasoning_tokens: 0 },
                        },
                        system_fingerprint: 'fp_refusal',
                     },
                  },
                  error: null,
               },
            ],
            errors: [],
         };
         const result = service.extractWordsAndTranslations(batchResponse);

         expect(result.words.length).toBe(0);
         expect(result.errors.length).toBe(1);
         expect(result.errors[0]).toHaveProperty('custom_id', 'request-2');
         expect(result.errors[0]).toHaveProperty('error');
      });

      it('should find specific word "aalend" with correct translations', () => {
         const fileContent = fs.readFileSync(path.join(__dirname, 'test', 'aalend_output.txt'), 'utf8');

         const batchResponse: BatchResponse = JSON.parse(fileContent);
         const result = service.extractWordsAndTranslations(batchResponse);

         expect(result.words.length).toBe(1);
         expect(result.words[0].german_word).toBe('aalend');
         expect(result.words[0].translations.verb).toEqual(['eel-shaped', 'relating to an eel']);
         expect(result.words[0].translations.adjective).toEqual(['eeling']);
         expect(result.words[0].translations.noun).toEqual([]);
      });
   });
});
