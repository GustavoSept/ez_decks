-- CreateEnum
CREATE TYPE "GrammarTypes" AS ENUM ('verb', 'noun', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'article', 'numeral', 'modal_verb');

-- CreateTable
CREATE TABLE "Language" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "primary_language" INTEGER NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "primary_language" INTEGER NOT NULL,
    "secondary_language" INTEGER NOT NULL,
    "type" "GrammarTypes" NOT NULL,
    "translation" TEXT NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimilarWord" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "primary_language" INTEGER NOT NULL,
    "similarWord" TEXT NOT NULL,

    CONSTRAINT "SimilarWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarCategory" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "primary_language" INTEGER NOT NULL,
    "secondary_language" INTEGER NOT NULL,
    "category" "GrammarTypes" NOT NULL,

    CONSTRAINT "GrammarCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Language_name_key" ON "Language"("name");

-- CreateIndex
CREATE INDEX "Word_primary_language_idx" ON "Word"("primary_language");

-- CreateIndex
CREATE INDEX "Translation_primary_language_secondary_language_idx" ON "Translation"("primary_language", "secondary_language");

-- CreateIndex
CREATE INDEX "SimilarWord_primary_language_idx" ON "SimilarWord"("primary_language");

-- CreateIndex
CREATE INDEX "GrammarCategory_primary_language_secondary_language_idx" ON "GrammarCategory"("primary_language", "secondary_language");

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_primary_language_fkey" FOREIGN KEY ("primary_language") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_primary_language_fkey" FOREIGN KEY ("primary_language") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_secondary_language_fkey" FOREIGN KEY ("secondary_language") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarWord" ADD CONSTRAINT "SimilarWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarWord" ADD CONSTRAINT "SimilarWord_primary_language_fkey" FOREIGN KEY ("primary_language") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarCategory" ADD CONSTRAINT "GrammarCategory_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarCategory" ADD CONSTRAINT "GrammarCategory_primary_language_fkey" FOREIGN KEY ("primary_language") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarCategory" ADD CONSTRAINT "GrammarCategory_secondary_language_fkey" FOREIGN KEY ("secondary_language") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
