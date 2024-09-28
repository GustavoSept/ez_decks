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

   /**
    * Removes duplicate words from a string[], and Capitalizes them.
    */
   deduplicateAndFormat(words: string[]): string[] {
      const seen = new Set<string>();

      return words
         .filter((word) => word.trim() !== '') // Remove empty strings
         .map((word) => word.toLowerCase()) // Convert to lowercase for consistent comparison
         .filter((word) => {
            if (seen.has(word)) {
               return false; // Skip duplicates
            }
            seen.add(word);
            return true;
         })
         .map((word) => word.charAt(0).toUpperCase() + word.slice(1)); // Capitalize the first letter
   }
}
