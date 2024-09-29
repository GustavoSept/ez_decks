import { Test, TestingModule } from '@nestjs/testing';
import { DictGeneratorService } from './dict-generator.service';

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
});
