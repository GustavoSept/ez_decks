import { Test, TestingModule } from '@nestjs/testing';
import { WordEngineService } from './word_engine.service';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('WordEngineService', () => {
   let service: WordEngineService;

   const expectedWords_duplicated: string[] = [
      '',
      'Funksprüche',
      'Rufe',
      'Junge',
      'Ein',
      'Typ',
      'der',
      'im',
      'Internet',
      'Drogen',
      'verkauft',
      'So',
      'stellt',
      'ihr',
      'euch',
      'das',
      'sicher',
      'vor',
      'Aber',
      'ich',
      'muss',
      'euch',
      'enttäuschen',
      'Dieser',
      'Kleinkriminelle',
      'bin',
      'nicht',
      'ich',
      'Das',
      'ist',
      'einer',
      'meiner',
      'zahlreichen',
      'Nachahmer',
      'Was',
      'soll',
      'der',
      'Junge',
      'denn',
      'gemacht',
      'haben',
      'Mal',
      'überlegen',
      'Er',
      'hat',
      'die',
      'Datenbank',
      'seines',
      'Online-Drogenshops',
      'nicht',
      'gegen',
      'Angriffe',
      'der',
      'Ermittlungsbehörden',
      'gesichert',
   ];

   const expectedWords_deduplicated: string[] = [
      'Aber',
      'Angriffe',
      'Das',
      'Datenbank',
      'Dieser',
      'Drogen',
      'Ein',
      'Er',
      'Ermittlungsbehörden',
      'Funksprüche',
      'Internet',
      'Junge',
      'Kleinkriminelle',
      'Mal',
      'Nachahmer',
      'Online-drogenshops',
      'Rufe',
      'So',
      'Typ',
      'Was',
      'Bin',
      'Denn',
      'Der',
      'Die',
      'Einer',
      'Enttäuschen',
      'Euch',
      'Gegen',
      'Gemacht',
      'Gesichert',
      'Haben',
      'Hat',
      'Ich',
      'Ihr',
      'Im',
      'Ist',
      'Meiner',
      'Muss',
      'Nicht',
      'Seines',
      'Sicher',
      'Soll',
      'Stellt',
      'Verkauft',
      'Vor',
      'Zahlreichen',
      'Überlegen',
   ];

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [WordEngineService],
      }).compile();

      service = module.get<WordEngineService>(WordEngineService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('is processing .srt file into string[]', async () => {
      let fileContent: string;

      try {
         const filePath = path.join(__dirname, 'test_files', 'short_subtitle.srt');

         // Read the file content asynchronously
         fileContent = await fs.readFile(filePath, 'utf8');
      } catch (error) {
         // Fail the test if there is an error
         fail(`Failed to read the file: ${error}`);
      }

      const listStr = service.process_srt(fileContent);

      // Ensure the result is the correct array of strings
      expect(Array.isArray(listStr)).toBe(true);
      expect(listStr.length).toBeGreaterThan(0);
      expect(listStr.every((item) => typeof item === 'string')).toBe(true);
      expect(listStr.sort()).toEqual(expectedWords_duplicated.sort());
   });

   it('is deduplicating a string[]', async () => {
      const deduplicatedStr: string[] = service.deduplicateAndFormat(expectedWords_duplicated);

      // Ensure the result is the correct array of strings
      expect(Array.isArray(deduplicatedStr)).toBe(true);
      expect(deduplicatedStr.length).toBeGreaterThan(0);
      expect(deduplicatedStr.every((item) => typeof item === 'string')).toBe(true);
      expect(deduplicatedStr.sort()).toEqual(expectedWords_deduplicated.sort());
   });

   it('processes the .srt file multiple times fast enough', async () => {
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
      expect(elapsedTime).toBeLessThan(650);
   });
});
