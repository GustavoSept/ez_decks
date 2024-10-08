import { Test, TestingModule } from '@nestjs/testing';
import { DictGeneratorService } from './dict-generator.service';
import { BatchResponse } from './openai/types/batch-result';
import * as fs from 'fs';
import path from 'path';
import { GenericTranslationShape } from './structs/translation-response.structs';

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
         expect(result.words[0]).toHaveProperty('word');
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
         expect(result.words[0].word).toBe('aalend');
         expect(result.words[0].translations.verb).toEqual(['eel-shaped', 'relating to an eel']);
         expect(result.words[0].translations.adjective).toEqual(['eeling']);
         expect(result.words[0].translations.noun).toEqual([]);
      });
   });

   describe('addSimilarWords()', () => {
      it('should add `similar words` based on `word` property', () => {
         const input: GenericTranslationShape[] = [
            { word: 'Aachen', translations: { noun: ['Aachen'] } },
            { word: 'Aachener', translations: { noun: ['native of Aachen'] } },
         ];

         const result = service.processTranslationResponse(input);

         expect(result[0]).toHaveProperty('similar_words');
         expect(result[1].similar_words).toContain('Aachen');
      });
      it('should add `similar words` based on their translations', () => {
         const input_noTranslation: GenericTranslationShape[] = [
            { word: 'aalähnlich', translations: { adjective: ['asdasddas'] } },
            { word: 'aalartig', translations: { adjective: ['ggfd'] } },
         ];
         const input_withTranslation: GenericTranslationShape[] = [
            { word: 'aalähnlich', translations: { adjective: ['eel-like', 'similar to an eel'] } },
            { word: 'aalartig', translations: { adjective: ['eel-like'] } },
         ];

         const result_shouldFail = service.processTranslationResponse(input_noTranslation);
         const result_working = service.processTranslationResponse(input_withTranslation);

         expect(result_shouldFail[0]).toHaveProperty('similar_words');
         expect(result_shouldFail[0].similar_words).toHaveLength(0);
         expect(result_shouldFail[1].similar_words).toHaveLength(0);
         expect(result_working[0].similar_words).toContain('aalartig');
         expect(result_working[1].similar_words).toContain('aalähnlich');
      });
      it('should add `grammar_categories` based on `word` translations', () => {
         const input_noTranslation: GenericTranslationShape[] = [
            {
               word: 'Aachener',
               translations: {
                  verb: [],
                  noun: ['native of Aachen', 'Aachen resident'],
                  adjective: ['Aachen'],
                  adverb: [],
                  pronoun: [],
                  preposition: [],
                  conjunction: [],
                  article: [],
                  numeral: [],
                  modal_verb: [],
               },
            },
         ];

         const result = service.processTranslationResponse(input_noTranslation);

         expect(result[0]).toHaveProperty('grammar_categories');
         expect(result[0].grammar_categories).toHaveLength(2);
         expect(result[0].grammar_categories).toEqual(expect.arrayContaining(['noun', 'adjective']));
      });
      it('should handle mid-sized inputs (194 words)', () => {
         const fileContent = fs.readFileSync(path.join(__dirname, 'test', '200_word_output.json'), 'utf8');

         const batchResponse: GenericTranslationShape[] = JSON.parse(fileContent);

         const result = service.processTranslationResponse(batchResponse, 3, 50);

         /* NOTE: For testing / debug purposes

         const testPath = path.join(__dirname, 'test', 'json_output');
         fs.mkdirSync(testPath, { recursive: true });
         fs.writeFileSync(path.join(testPath, 'similar_distThresh-3_maxNeigh-50.json'), JSON.stringify(result, undefined, 2));

         */
         expect(result[0]).toHaveProperty('similar_words');
         expect(result[0]).toHaveProperty('grammar_categories');
         expect(result).toHaveLength(194);
      });
   });
});
