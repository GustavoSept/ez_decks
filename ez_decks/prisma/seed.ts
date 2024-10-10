// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { Language as LanguageEnum } from '../src/prisma/language.enum';

const prisma = new PrismaClient();

async function main() {
   // Convert the enum into an array of objects for seeding
   const languagesToSeed = Object.keys(LanguageEnum)
      .filter((key) => isNaN(Number(key))) // Filtering out the numeric keys
      .map((key) => ({
         name: key, // Enum key, which represents the language name
      }));

   // Looping through the languages and inserting them into the database
   for (const language of languagesToSeed) {
      await prisma.language.upsert({
         where: { name: language.name },
         update: {}, // In case it exists, no update is necessary
         create: {
            name: language.name,
         },
      });
   }
}

main()
   .catch((e) => {
      console.error(e);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
