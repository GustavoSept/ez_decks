import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import path from 'path';
import { ChatCompletionMessage } from 'openai/resources';
import { node_env } from '../../common/config/constants';
import {
   GenericTranslationShape,
   ProcessedTranslationResponse,
   WesternTranslationResponseObj,
} from '../structs/translation-response.structs';
import { OpenaiService } from './openai.service';
import { OpenAIProvider } from './providers';
import { DEFAULT_SYS_MESSAGE } from './constants';
import { BatchService } from './batch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Language } from '../../prisma/language.enum';
import { GrammarTypes } from '@prisma/client';

describe('OpenaiService: simple queries', () => {
   let service: OpenaiService;
   let configService: ConfigService;
   let runExternalApiTests: boolean;

   expect(node_env).toBe('test');

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         imports: [
            ConfigModule.forRoot({
               isGlobal: true,
               envFilePath: [`.env.${node_env}.local`, '.env'],
               expandVariables: true,
            }),
         ],
         providers: [OpenaiService, OpenAIProvider, BatchService, PrismaService],
      }).compile();

      service = module.get<OpenaiService>(OpenaiService);
      configService = module.get<ConfigService>(ConfigService);

      runExternalApiTests = configService.get<string>('RUN_EXTERNAL_API_TESTS', 'false') === 'true';
   });

   it('openai object should be defined', () => {
      expect(service).toBeDefined();
      expect(service['openai']).toBeDefined(); // Ensuring the OpenAI instance is injected.
   });

   it('gets simple inference from openAI', async () => {
      if (!runExternalApiTests) {
         console.log('Skipping external API test since RUN_EXTERNAL_API_TESTS is not set to true');
         return;
      }

      const response: ChatCompletionMessage = await service.query(
         'Who is the president of the United States?'
      );
      expect(response.content).toBeTruthy();
      expect((response?.content ?? '').length > 0).toBe(true);
      console.log(response.content);
   }, 15000);

   it('gets structured inference from OpenAI', async () => {
      if (!runExternalApiTests) {
         console.log('Skipping external API test since RUN_EXTERNAL_API_TESTS is not set to true');
         return;
      }

      // Adjusting the prompt for the structure
      const prompt = `Translate these words: "gehen", "Haus", "schön"`;
      const sysMsg = DEFAULT_SYS_MESSAGE;

      const response = await service.structuredQuery(
         prompt,
         WesternTranslationResponseObj,
         'germanTranslation',
         sysMsg
      );

      expect(response).toBeTruthy();
      expect(response.response).toBeInstanceOf(Array);

      const gehenObj = response.response.find((item) => item.word === 'gehen');
      expect(gehenObj).toBeTruthy();
      expect(gehenObj?.translations.verb).toContain('go');

      const hausObj = response.response.find((item) => item.word === 'Haus');
      expect(hausObj?.translations.noun).toContain('house');

      const schonObj = response.response.find((item) => item.word === 'schön');
      expect(schonObj?.translations.adjective).toContain('beautiful');

      expect(schonObj?.translations.conjunction?.length).toBe(0);

      console.log(`Structured inference: ${JSON.stringify(response, null, 2)}`);
   }, 60000);
});

describe('OpenaiService: saveBatchResult()', () => {
   let openaiService: OpenaiService;
   let prismaService: PrismaService;

   beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
         imports: [
            ConfigModule.forRoot({
               isGlobal: true,
               envFilePath: [`.env.test.local`, '.env'],
               expandVariables: true,
            }),
         ],
         providers: [OpenaiService, BatchService, PrismaService, OpenAIProvider, ConfigService],
      }).compile();

      openaiService = module.get<OpenaiService>(OpenaiService);
      prismaService = module.get<PrismaService>(PrismaService);

      await prismaService.$connect(); // Ensure Prisma is connected before running tests
   });

   afterAll(async () => {
      await prismaService.$disconnect(); // Disconnect Prisma after tests
   });

   beforeEach(async () => {
      // Clean up the database after each test
      await prismaService.grammarCategory.deleteMany();
      await prismaService.similarWord.deleteMany();
      await prismaService.translation.deleteMany();
      await prismaService.word.deleteMany();
   });

   it('openai object should be defined', () => {
      expect(openaiService).toBeDefined();
   });

   it('should save each field of processed words to the database (field-level verification)', async () => {
      // Load the JSON file containing word objects
      const processedWords: ProcessedTranslationResponse<GenericTranslationShape>[] = JSON.parse(
         fs.readFileSync(path.join(__dirname, '..', 'test', 'logical_word_processed_output.json'), 'utf-8')
      ).slice(0, 150, 5);

      // Call the method to save batch result
      await openaiService.saveBatchResult(processedWords, Language.German, Language.English);

      const cleanedProcessedWords = openaiService.cleanProcessedTranslationResponse(processedWords);

      // Verify each field for each processed word
      for (const processedWord of cleanedProcessedWords) {
         // Check if the word is saved correctly
         const wordEntry = await prismaService.word.findUnique({
            where: {
               primary_language_word: {
                  primary_language: Language.German,
                  word: processedWord.word,
               },
            },
         });
         expect(wordEntry).not.toBeNull();

         // Check if translations are saved correctly
         for (const [type, translations] of Object.entries(processedWord.translations)) {
            for (const translation of translations) {
               const translationEntry = await prismaService.translation.findUnique({
                  where: {
                     wordId_secondary_language_translation_type: {
                        wordId: wordEntry!.id,
                        secondary_language: Language.English,
                        translation: translation,
                        type: type as GrammarTypes,
                     },
                  },
               });
               expect(translationEntry).not.toBeNull();
            }
         }

         // Check if similar words are saved correctly
         for (const similarWord of processedWord.similar_words) {
            const similarWordEntry = await prismaService.similarWord.findFirst({
               where: {
                  wordId: wordEntry!.id,
                  similarWord: {
                     word: similarWord,
                     language: { id: Language.German },
                  },
               },
            });
            expect(similarWordEntry).not.toBeNull();
         }

         // Check if grammar categories are saved correctly
         for (const category of processedWord.grammar_categories) {
            const grammarCategoryEntry = await prismaService.grammarCategory.findUnique({
               where: {
                  wordId_category: {
                     wordId: wordEntry!.id,
                     category: category as GrammarTypes,
                  },
               },
            });
            expect(grammarCategoryEntry).not.toBeNull();
         }
      }
   });

   it('should save processed words to the database (200 real words)', async () => {
      // Load the JSON file containing 180 word objects (despite the name saying 200...I know.)
      const processedWords: ProcessedTranslationResponse<GenericTranslationShape>[] = JSON.parse(
         fs.readFileSync(path.join(__dirname, '..', 'test', '200_word_processed_output.json'), 'utf-8')
      ).slice(0, 150, 5);

      // Call the method to save batch result
      await openaiService.saveBatchResult(processedWords, Language.German, Language.English);

      const cleanedProcessedWords = openaiService.cleanProcessedTranslationResponse(processedWords);

      // Verify the total number of Words saved.
      const wordEntries = await prismaService.word.findMany({
         where: { language: { id: Language.German } },
      });

      expect(wordEntries.length).toBe(cleanedProcessedWords.length);

      // Verify the total number of Translations saved
      const totalTranslations = cleanedProcessedWords.reduce((acc, word) => {
         return (
            acc +
            Object.values(word.translations).reduce(
               (sum, translationArray) => sum + translationArray.length,
               0
            )
         );
      }, 0);

      const translationEntries = await prismaService.translation.findMany({
         where: {
            secondaryLanguage: { id: Language.English },
            word: { language: { id: Language.German } },
         },
      });
      expect(translationEntries.length).toBe(totalTranslations);

      // Verify the total number of SimilarWords saved
      const totalSimilarWords = cleanedProcessedWords.reduce(
         (acc, word) => acc + word.similar_words.length,
         0
      );

      const similarWordEntries = await prismaService.similarWord.findMany({
         where: { word: { language: { id: Language.German } } },
      });

      const upperLimit = totalSimilarWords;
      const lowerLimit = Math.floor(totalSimilarWords * 0.97); // 3% margin below totalSimilarWords. Account for malformed input in the .json file

      expect(similarWordEntries.length).toBeGreaterThanOrEqual(lowerLimit);
      expect(similarWordEntries.length).toBeLessThanOrEqual(upperLimit);

      // Verify the total number of GrammarCategories saved
      const totalGrammarCategories = cleanedProcessedWords.reduce(
         (acc, word) => acc + word.grammar_categories.length,
         0
      );

      const grammarCategoryEntries = await prismaService.grammarCategory.findMany({
         where: { word: { language: { id: Language.German } } },
      });
      expect(grammarCategoryEntries.length).toBe(totalGrammarCategories);
   });
});
