import { GrammarTypes } from '@prisma/client';

export function mapStringToGrammarType(type: string): GrammarTypes {
   switch (type) {
      case 'verb':
         return GrammarTypes.verb;
      case 'noun':
         return GrammarTypes.noun;
      case 'adjective':
         return GrammarTypes.adjective;
      case 'adverb':
         return GrammarTypes.adverb;
      case 'pronoun':
         return GrammarTypes.pronoun;
      case 'preposition':
         return GrammarTypes.preposition;
      case 'conjunction':
         return GrammarTypes.conjunction;
      case 'article':
         return GrammarTypes.article;
      case 'numeral':
         return GrammarTypes.numeral;
      case 'modal_verb':
         return GrammarTypes.modal_verb;
      default:
         throw new Error(`Unknown grammar type: ${type}`);
   }
}
