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
      it('should allow adding model Word with valid data', async () => {
         const wordData1 = { word: 'validWord', primary_language: 1 };
         const wordData2 = { word: 'anotherWord', primary_language: 2 };
         const wordData3 = { word: 'ThisIsTheEnd', primary_language: 1 };
         const word1 = await prisma.word.create({ data: wordData1 });
         const word2 = await prisma.word.create({ data: wordData2 });
         const word3 = await prisma.word.create({ data: wordData3 });
         expect(word1).toHaveProperty('id');
         expect(word2).toHaveProperty('id');
         expect(word3).toHaveProperty('id');
      });

      it('should not allow two Words with the same primary_language and word combination', async () => {
         const wordData1 = { word: 'testOne', primary_language: 1 };
         const wordData2 = { word: 'testOne', primary_language: 1 };
         await prisma.word.create({ data: wordData1 });

         await expect(prisma.word.create({ data: wordData2 })).rejects.toThrow(PrismaClientKnownRequestError);
      });
   });

   describe('Translation Model', () => {
      beforeEach(async () => {
         await prisma.word.create({
            data: { id: 1, word: 'mandatoryWord', primary_language: 1 },
         });
      });

      it('should allow adding a Translation with valid data', async () => {
         const translationData = {
            wordId: 1,
            secondary_language: 2,
            type: 'noun' as const,
            translation: 'validTranslation',
         };
         const translation = await prisma.translation.create({ data: translationData });
         expect(translation).toHaveProperty('id');
      });

      it('should not allow two Translations with the same wordId, secondary_language, translation, and type', async () => {
         const translationData1 = {
            wordId: 1,
            secondary_language: 2,
            type: 'noun' as const,
            translation: 'testTranslation',
         };
         const translationData2 = {
            wordId: 1,
            secondary_language: 2,
            type: 'noun' as const,
            translation: 'testTranslation',
         };
         await prisma.translation.create({ data: translationData1 });

         await expect(prisma.translation.create({ data: translationData2 })).rejects.toThrow(
            PrismaClientKnownRequestError
         );
      });

      it('should allow two Translations with the same wordId, secondary_language, translation, but different type', async () => {
         const translationData1 = {
            wordId: 1,
            secondary_language: 2,
            type: 'noun' as const,
            translation: 'testTranslation',
         };
         const translationData2 = {
            wordId: 1,
            secondary_language: 2,
            type: 'verb' as const,
            translation: 'testTranslation',
         };
         await prisma.translation.create({ data: translationData1 });
         const translation = await prisma.translation.create({ data: translationData2 });
         expect(translation).toHaveProperty('id');
      });

      it('should allow two Translations with the same wordId, type and secondary_language, but different translation', async () => {
         const translationData1 = {
            wordId: 1,
            secondary_language: 2,
            type: 'noun' as const,
            translation: 'testTranslation1',
         };
         const translationData2 = {
            wordId: 1,
            secondary_language: 2,
            type: 'noun' as const,
            translation: 'testTranslation2',
         };
         await prisma.translation.create({ data: translationData1 });
         const translation = await prisma.translation.create({ data: translationData2 });
         expect(translation).toHaveProperty('id');
      });
   });

   describe('SimilarWord Model', () => {
      beforeEach(async () => {
         // Group A
         await prisma.word.create({
            data: { id: 1, word: 'A', primary_language: 1 },
         });
         await prisma.word.create({
            data: { id: 2, word: 'AA', primary_language: 1 },
         });
         await prisma.word.create({
            data: { id: 3, word: 'AAA', primary_language: 1 },
         });

         // Group B
         await prisma.word.create({
            data: { id: 4, word: 'B', primary_language: 1 },
         });
         await prisma.word.create({
            data: { id: 5, word: 'BB', primary_language: 1 },
         });
         await prisma.word.create({
            data: { id: 6, word: 'BBB', primary_language: 1 },
         });
      });

      it('should allow adding a SimilarWord with valid data', async () => {
         const similarWordData1 = { wordId: 1, similar_word: 2 };

         const similarWord1 = await prisma.similarWord.create({ data: similarWordData1 });
         expect(similarWord1).toHaveProperty('id');
      });

      it('should not allow two SimilarWords with the same wordId and similar_word combination', async () => {
         const similarWordData1 = { wordId: 1, similar_word: 2 };
         const similarWordData2 = { wordId: 1, similar_word: 2 };
         await prisma.similarWord.create({ data: similarWordData1 });

         await expect(prisma.similarWord.create({ data: similarWordData2 })).rejects.toThrow(
            PrismaClientKnownRequestError
         );
      });

      it('should allow two SimilarWords with the same wordId, but different similar_word', async () => {
         const similarWordData1 = { wordId: 1, similar_word: 2 };
         const similarWordData2 = { wordId: 1, similar_word: 3 };
         await prisma.similarWord.create({ data: similarWordData1 });
         const similarWord = await prisma.similarWord.create({ data: similarWordData2 });
         expect(similarWord).toHaveProperty('id');
      });
   });

   describe('GrammarCategory Model', () => {
      beforeEach(async () => {
         await prisma.word.create({
            data: { id: 1, word: 'mandatoryWord', primary_language: 1 },
         });
      });

      it('should allow adding a GrammarCategory with valid data', async () => {
         const grammarCategoryData = {
            wordId: 1,
            category: 'noun' as const,
         };
         const grammarCategory = await prisma.grammarCategory.create({ data: grammarCategoryData });
         expect(grammarCategory).toHaveProperty('id');
      });

      it('should not allow two GrammarCategories with the same secondary_language, wordId, and category combination', async () => {
         const grammarCategoryData1 = {
            wordId: 1,
            category: 'noun' as const,
         };
         const grammarCategoryData2 = {
            wordId: 1,
            category: 'noun' as const,
         };
         await prisma.grammarCategory.create({ data: grammarCategoryData1 });

         await expect(prisma.grammarCategory.create({ data: grammarCategoryData2 })).rejects.toThrow(
            PrismaClientKnownRequestError
         );
      });

      it('should allow two GrammarCategories with the same secondary_language and wordId, but different category', async () => {
         const grammarCategoryData1 = {
            wordId: 1,
            category: 'noun' as const,
         };
         const grammarCategoryData2 = {
            wordId: 1,
            category: 'verb' as const,
         };
         await prisma.grammarCategory.create({ data: grammarCategoryData1 });
         const grammarCategory = await prisma.grammarCategory.create({ data: grammarCategoryData2 });
         expect(grammarCategory).toHaveProperty('id');
      });
   });
});
