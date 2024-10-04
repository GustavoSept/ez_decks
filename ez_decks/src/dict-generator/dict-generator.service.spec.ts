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
