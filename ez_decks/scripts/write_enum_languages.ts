/*
 * Generates a typescript enum with all languages in the 'languages.txt' file
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Read the 'languages.txt' file
const filePath = join(__dirname, 'languages.txt');
const languages: string[] = readFileSync(filePath, 'utf-8')
   .split('\n')
   .map((line) => line.trim())
   .filter(Boolean);

let output: string = 'export enum Language {\n';

let counter: number = 1;
for (let i = 0; i < languages.length; i++) {
   const lang = languages[i];
   output += `  ${lang} = ${counter},\n`;
   counter++;
}

output += '}';

// Write the result to 'languages_enum.ts'
const outputPath = join(__dirname, 'languages_enum.ts');
writeFileSync(outputPath, output);

console.log('languages_enum.ts has been generated.');
