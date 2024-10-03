import { z } from 'zod';

export const TranslationResponse = z.object({
   response: z.array(
      z.object({
         german_word: z.string(),
         translations: z.object({
            verb: z.array(z.string()).optional(),
            noun: z.array(z.string()).optional(),
            adjective: z.array(z.string()).optional(),
            adverb: z.array(z.string()).optional(),
            pronoun: z.array(z.string()).optional(),
            preposition: z.array(z.string()).optional(),
            conjunction: z.array(z.string()).optional(),
            article: z.array(z.string()).optional(),
            numeral: z.array(z.string()).optional(),
            modal_verb: z.array(z.string()).optional(),
         }),
      })
   ),
});
