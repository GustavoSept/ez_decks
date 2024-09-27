import { Injectable } from '@nestjs/common';

@Injectable()
export class WordEngineService {
   /**
    * Transforms an .srt file into a string[]
    */
   process_srt(text: string): string[] {
      // Splitting text into lines
      let lines = text.split('\n');

      // Step 1: Remove lines with timestamp and preceding number
      lines = lines.filter((line, index) => {
         const isNumberLine = /^\d+$/.test(lines[index - 1] || '');
         const isTimestampLine = /-->/.test(line);
         return !(isNumberLine || isTimestampLine);
      });

      // Step 2: Remove HTML tags
      lines = lines.map((line) => line.replace(/<[^>]*>/g, ''));

      // Step 3: Remove empty rows
      lines = lines.filter((line) => line.trim() !== '');

      // Step 4: Remove special characters, but keep accents and hyphens
      const cleanedText = lines.join(' ').replace(/[^\p{L}\p{M}\s\-]/gu, '');

      // Step 5: Split into words and return
      return cleanedText.split(/\s+/);
   }
}
