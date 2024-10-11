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
      expect(service['openai']).toBeDefined(); // Ensuring the OpenAI instance is injected
   });

   it('gets simple inference from openAI', async () => {
      if (!runExternalApiTests) {
         console.log('Skipping external API test since RUN_EXTERNAL_API_TESTS is not set to true');
         return;
      }

      const response: ChatCompletionMessage = await service.query('Who is the president of the United States?');
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

      const response = await service.structuredQuery(prompt, WesternTranslationResponseObj, 'germanTranslation', sysMsg);

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

   afterEach(async () => {
      // Clean up the database after each test
      await prismaService.grammarCategory.deleteMany();
      await prismaService.similarWord.deleteMany();
      await prismaService.translation.deleteMany();
      await prismaService.word.deleteMany();
   });

   it('openai object should be defined', () => {
      expect(openaiService).toBeDefined();
   });

   it('should save processed words to the database', async () => {
      // Load the JSON file containing 180 word objects (despite the name saying 200...I know.)
      const processedWords: ProcessedTranslationResponse<GenericTranslationShape>[] = JSON.parse(
         fs.readFileSync(path.join(__dirname, '..', 'test', '200_word_processed_output.json'), 'utf-8')
      );

      // Call the method to save batch result
      await openaiService.saveBatchResult(processedWords, Language.German, Language.English);

      // Verify the total number of Words saved.
      const wordEntries = await prismaService.word.findMany({
         where: { primary_language: Language.German },
      });

      if (wordEntries.length !== processedWords.length) {
         const missingWords = processedWords.filter((word) => !wordEntries.some((entry) => entry.word === word.word));
         console.log(
            'Missing words:',
            missingWords.map((word) => word.word)
         );

         const duplicateWords = processedWords.map((word) => word.word).filter((word, index, self) => self.indexOf(word) !== index);
         console.log('Duplicate words:', duplicateWords);
      }

      expect(wordEntries.length).toBe(processedWords.length);

      // Verify the total number of Translations saved
      const totalTranslations = processedWords.reduce((acc, word) => {
         return acc + Object.values(word.translations).reduce((sum, translationArray) => sum + translationArray.length, 0);
      }, 0);

      const translationEntries = await prismaService.translation.findMany({
         where: { primary_language: Language.German, secondary_language: Language.English },
      });
      expect(translationEntries.length).toBe(totalTranslations);

      // Verify the total number of SimilarWords saved
      const totalSimilarWords = processedWords.reduce((acc, word) => acc + word.similar_words.length, 0);

      const similarWordEntries = await prismaService.similarWord.findMany({
         where: { primary_language: Language.German },
      });
      expect(similarWordEntries.length).toBe(totalSimilarWords);

      // Verify the total number of GrammarCategories saved
      const totalGrammarCategories = processedWords.reduce((acc, word) => acc + word.grammar_categories.length, 0);

      const grammarCategoryEntries = await prismaService.grammarCategory.findMany({
         where: { primary_language: Language.German },
      });
      expect(grammarCategoryEntries.length).toBe(totalGrammarCategories);
   });
});
