/*
  Warnings:

  - You are about to drop the column `secondary_language` on the `GrammarCategory` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[wordId,category]` on the table `GrammarCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "GrammarCategory" DROP CONSTRAINT "GrammarCategory_secondary_language_fkey";

-- DropIndex
DROP INDEX "GrammarCategory_secondary_language_wordId_category_key";

-- DropIndex
DROP INDEX "GrammarCategory_wordId_secondary_language_idx";

-- AlterTable
ALTER TABLE "GrammarCategory" DROP COLUMN "secondary_language";

-- CreateIndex
CREATE UNIQUE INDEX "GrammarCategory_wordId_category_key" ON "GrammarCategory"("wordId", "category");
