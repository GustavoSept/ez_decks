import { Injectable } from '@nestjs/common';

@Injectable()
export class DictGeneratorService {
   /**
    * Splits the content of a .txt file into an array of arrays, each containing up to batchSize elements.
    */
   splitFileIntoBatches(fileContent: Buffer, batchSize: number = 8): string[][] {
      // Convert buffer to string and split by new lines
      const lines = fileContent
         .toString('utf-8')
         .split(/\r?\n/) // Split by line-break (\r is windows-specific and optional, \n is global)
         .filter((line) => line.trim() !== '');

      const batches: string[][] = [];

      for (let i = 0; i < lines.length; i += batchSize) {
         batches.push(lines.slice(i, i + batchSize));
      }

      return batches;
   }
}
