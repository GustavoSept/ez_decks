/*
  Warnings:

  - You are about to drop the column `primary_language` on the `GrammarCategory` table. All the data in the column will be lost.
  - You are about to drop the column `primary_language` on the `SimilarWord` table. All the data in the column will be lost.
  - You are about to drop the column `similarWord` on the `SimilarWord` table. All the data in the column will be lost.
  - You are about to drop the column `primary_language` on the `Translation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[secondary_language,wordId,category]` on the table `GrammarCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[wordId,similar_word,id]` on the table `SimilarWord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[wordId,secondary_language,translation,type]` on the table `Translation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[primary_language,word]` on the table `Word` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `similar_word` to the `SimilarWord` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GrammarCategory" DROP CONSTRAINT "GrammarCategory_primary_language_fkey";

-- DropForeignKey
ALTER TABLE "GrammarCategory" DROP CONSTRAINT "GrammarCategory_secondary_language_fkey";

-- DropForeignKey
ALTER TABLE "GrammarCategory" DROP CONSTRAINT "GrammarCategory_wordId_fkey";

-- DropForeignKey
ALTER TABLE "SimilarWord" DROP CONSTRAINT "SimilarWord_primary_language_fkey";

-- DropForeignKey
ALTER TABLE "SimilarWord" DROP CONSTRAINT "SimilarWord_wordId_fkey";

-- DropForeignKey
ALTER TABLE "Translation" DROP CONSTRAINT "Translation_primary_language_fkey";

-- DropForeignKey
ALTER TABLE "Translation" DROP CONSTRAINT "Translation_secondary_language_fkey";

-- DropForeignKey
ALTER TABLE "Translation" DROP CONSTRAINT "Translation_wordId_fkey";

-- DropForeignKey
ALTER TABLE "Word" DROP CONSTRAINT "Word_primary_language_fkey";

-- DropIndex
DROP INDEX "GrammarCategory_primary_language_secondary_language_idx";

-- DropIndex
DROP INDEX "SimilarWord_primary_language_idx";

-- DropIndex
DROP INDEX "Translation_primary_language_secondary_language_idx";

-- DropIndex
DROP INDEX "Word_primary_language_idx";

-- AlterTable
ALTER TABLE "GrammarCategory" DROP COLUMN "primary_language";

-- AlterTable
ALTER TABLE "SimilarWord" DROP COLUMN "primary_language",
DROP COLUMN "similarWord",
ADD COLUMN     "similar_word" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Translation" DROP COLUMN "primary_language";

-- CreateIndex
CREATE INDEX "GrammarCategory_wordId_secondary_language_idx" ON "GrammarCategory"("wordId", "secondary_language");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarCategory_secondary_language_wordId_category_key" ON "GrammarCategory"("secondary_language", "wordId", "category");

-- CreateIndex
CREATE INDEX "SimilarWord_similar_word_wordId_idx" ON "SimilarWord"("similar_word", "wordId");

-- CreateIndex
CREATE UNIQUE INDEX "SimilarWord_wordId_similar_word_id_key" ON "SimilarWord"("wordId", "similar_word", "id");

-- CreateIndex
CREATE INDEX "Translation_secondary_language_translation_idx" ON "Translation"("secondary_language", "translation");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_wordId_secondary_language_translation_type_key" ON "Translation"("wordId", "secondary_language", "translation", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Word_primary_language_word_key" ON "Word"("primary_language", "word");

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_primary_language_fkey" FOREIGN KEY ("primary_language") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_secondary_language_fkey" FOREIGN KEY ("secondary_language") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarWord" ADD CONSTRAINT "SimilarWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarWord" ADD CONSTRAINT "SimilarWord_similar_word_fkey" FOREIGN KEY ("similar_word") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarCategory" ADD CONSTRAINT "GrammarCategory_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarCategory" ADD CONSTRAINT "GrammarCategory_secondary_language_fkey" FOREIGN KEY ("secondary_language") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
