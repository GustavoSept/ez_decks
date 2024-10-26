import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('Prisma Schema Validation Tests', () => {
   const prisma = new PrismaClient();

   beforeAll(async () => {
      await prisma.$connect();
   });

   beforeEach(async () => {
      await prisma.word.deleteMany();
      await prisma.translation.deleteMany();
      await prisma.similarWord.deleteMany();
      await prisma.grammarCategory.deleteMany();
   });

   afterAll(async () => {
      await prisma.$disconnect();
   });

   describe('Word Model', () => {
      it('should not allow two Words with the same primary_language and word combination', async () => {
         const wordData = { word: 'test', primary_language: 1 };
         await prisma.word.create({ data: wordData });

         await expect(prisma.word.create({ data: wordData })).rejects.toThrow(PrismaClientKnownRequestError);
      });
   });

   describe('Translation Model', () => {
      it('should not allow two Translations with the same wordId, secondary_language, translation, and type', async () => {
         const translationData = {
            wordId: 1,
            secondary_language: 2,
            type: 'noun' as const,
            translation: 'testTranslation',
         };
         await prisma.translation.create({ data: translationData });

         await expect(prisma.translation.create({ data: translationData })).rejects.toThrow(
            PrismaClientKnownRequestError
         );
      });
   });

   describe('SimilarWord Model', () => {
      it('should not allow two SimilarWords with the same wordId and similar_word combination', async () => {
         const similarWordData = { wordId: 1, similar_word: 2 };
         await prisma.similarWord.create({ data: similarWordData });

         await expect(prisma.similarWord.create({ data: similarWordData })).rejects.toThrow(
            PrismaClientKnownRequestError
         );
      });
   });

   describe('GrammarCategory Model', () => {
      it('should not allow two GrammarCategories with the same secondary_language, wordId, and category combination', async () => {
         const grammarCategoryData = {
            wordId: 1,
            secondary_language: 2,
            category: 'noun' as const,
         };
         await prisma.grammarCategory.create({ data: grammarCategoryData });

         await expect(prisma.grammarCategory.create({ data: grammarCategoryData })).rejects.toThrow(
            PrismaClientKnownRequestError
         );
      });
   });
});
