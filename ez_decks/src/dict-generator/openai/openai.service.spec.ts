import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { node_env } from '../../common/config/constants';
import { TranslationResponse } from '../structs/translation-response.zod';
import { OpenaiService } from './openai.service';
import { OpenAIProvider } from './providers';
import { DEFAULT_SYS_MESSAGE } from './constants';
import { BatchService } from './batch.service';
import { ChatCompletionMessage } from 'openai/resources';

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
         providers: [OpenaiService, OpenAIProvider, BatchService],
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

      const response = await service.structuredQuery(prompt, TranslationResponse, 'germanTranslation', sysMsg);

      expect(response).toBeTruthy();
      expect(response.response).toBeInstanceOf(Array);

      const gehenObj = response.response.find((item) => item.german_word === 'gehen');
      expect(gehenObj).toBeTruthy();
      expect(gehenObj?.translations.verb).toContain('go');

      const hausObj = response.response.find((item) => item.german_word === 'Haus');
      expect(hausObj?.translations.noun).toContain('house');

      const schonObj = response.response.find((item) => item.german_word === 'schön');
      expect(schonObj?.translations.adjective).toContain('beautiful');

      expect(schonObj?.translations.conjunction?.length).toBe(0);

      console.log(`Structured inference: ${JSON.stringify(response, null, 2)}`);
   }, 60000);
});
