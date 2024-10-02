import { Test, TestingModule } from '@nestjs/testing';
import { DictGeneratorService } from './dict-generator.service';
import { node_env } from '../common/config/constants';

describe('DictGeneratorService', () => {
   let service: DictGeneratorService;

   expect(node_env).toBe('test');

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
