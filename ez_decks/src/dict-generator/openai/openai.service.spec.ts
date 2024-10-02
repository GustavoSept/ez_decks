import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenaiService } from './openai.service';
import { OpenAIProvider } from './providers';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessage } from 'openai/resources';
import { node_env } from '../../common/config/constants';

describe('OpenaiService', () => {
   let service: OpenaiService;
   let configService: ConfigService;
   let runExternalApiTests: boolean;

   expect(node_env).toBe('test');

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [OpenaiService, OpenAIProvider, ConfigService], // Use the same provider as in the module
      }).compile();

      service = module.get<OpenaiService>(OpenaiService);
      configService = module.get<ConfigService>(ConfigService);

      runExternalApiTests = configService.get<boolean>('RUN_EXTERNAL_API_TESTS', false);
   });

   it('should be defined', () => {
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
   });
});
