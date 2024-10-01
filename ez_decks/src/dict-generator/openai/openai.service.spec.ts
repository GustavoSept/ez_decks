import { Test, TestingModule } from '@nestjs/testing';
import { OpenaiService } from './openai.service';
import { OpenAIProvider } from './providers';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessage } from 'openai/resources';

describe('OpenaiService', () => {
   let service: OpenaiService;
   let configService: ConfigService;

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [OpenaiService, OpenAIProvider, ConfigService], // Use the same provider as in the module
      }).compile();

      service = module.get<OpenaiService>(OpenaiService);
      configService = module.get<ConfigService>(ConfigService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service['openai']).toBeDefined(); // Ensuring the OpenAI instance is injected
   });

   it('gets inference from openAI', async () => {
      const runExternalApiTests = configService.get<boolean>('RUN_EXTERNAL_API_TESTS', false);

      if (!runExternalApiTests) {
         console.log('Skipping external API test since RUN_EXTERNAL_API_TESTS is not set to true');
         return;
      }

      const response: ChatCompletionMessage = await service.query('Who is the president of the United States?');
      expect(response.content).toBeTruthy();
      expect((response?.content ?? '').length > 0).toBe(true);
      console.log(response.content);
   });
});
