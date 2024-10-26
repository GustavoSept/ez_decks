/*
  Warnings:

  - A unique constraint covering the columns `[wordId,similar_word]` on the table `SimilarWord` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SimilarWord_wordId_similar_word_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "SimilarWord_wordId_similar_word_key" ON "SimilarWord"("wordId", "similar_word");
