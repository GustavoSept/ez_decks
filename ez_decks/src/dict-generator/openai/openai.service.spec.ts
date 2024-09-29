import { Test, TestingModule } from '@nestjs/testing';
import { OpenaiService } from './openai.service';
import { OpenAIProvider } from './providers';

describe('OpenaiService', () => {
   let service: OpenaiService;

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [OpenaiService, OpenAIProvider], // Use the same provider as in the module
      }).compile();

      service = module.get<OpenaiService>(OpenaiService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('injects correctly', () => {
      expect(service['openai']).toBeDefined(); // Ensuring the OpenAI instance is injected
   });
});
