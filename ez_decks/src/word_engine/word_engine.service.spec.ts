import { Test, TestingModule } from '@nestjs/testing';
import { WordEngineService } from './word_engine.service';
import fs from 'node:fs/promises';
import path from 'node:path';
import { logSystemInfo } from '../common/utils/system.util';

describe('WordEngineService', () => {
   let service: WordEngineService;

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [WordEngineService],
      }).compile();

      service = module.get<WordEngineService>(WordEngineService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('is processing .srt file into string[] (How to sell drugs online fast s01e01)', async () => {
      let fileContent: string;

      try {
         const filePath = path.join(__dirname, 'test_files', 'How.to.Sell.Drugs.Online.Fast.S01E01.German.NetflixSD.x264-4SJ-de.srt');

         // Read the file content asynchronously
         fileContent = await fs.readFile(filePath, 'utf8');
      } catch (error) {
         // Fail the test if there is an error
         fail(`Failed to read the file: ${error}`);
      }

      const listStr = service.process_srt(fileContent);

      // console.log(listStr);

      // Ensure the result is an array of strings
      expect(Array.isArray(listStr)).toBe(true);
      expect(listStr.length).toBeGreaterThan(0);
      expect(listStr.every((item) => typeof item === 'string')).toBe(true);
   });

   it('processes the .srt file multiple times in less than 1 second', async () => {
      const filePath = path.join(__dirname, 'test_files', 'How.to.Sell.Drugs.Online.Fast.S01E01.German.NetflixSD.x264-4SJ-de.srt');

      let fileContent: string;

      try {
         fileContent = await fs.readFile(filePath, 'utf8');
      } catch (error) {
         fail(`Failed to read the file: ${error}`);
      }

      const startTime = Date.now();

      // Number of times to repeat the process
      const repeatCount = 100;

      for (let i = 0; i < repeatCount; i++) {
         const listStr = service.process_srt(fileContent);

         // Ensure the result is an array of strings
         expect(Array.isArray(listStr)).toBe(true);
         expect(listStr.length).toBeGreaterThan(0);
         expect(listStr.every((item) => typeof item === 'string')).toBe(true);
      }

      // End timer
      const endTime = Date.now();
      const elapsedTime = endTime - startTime;

      console.log(`Elapsed time to run process_srt() test ${repeatCount} times: ${elapsedTime}ms`);

      // Assert that the entire process took less than 1250 milliseconds (1.25 seconds)
      expect(elapsedTime).toBeLessThan(1250);
   });

   it('Prints resource usage', async () => {
      logSystemInfo();
   });
});
