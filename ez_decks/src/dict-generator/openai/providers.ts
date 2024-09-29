import { Provider } from '@nestjs/common';
import OpenAI from 'openai';

export const OpenAIProvider: Provider = {
   provide: 'OPENAI_API',
   useFactory: () => {
      const openai = new OpenAI({
         apiKey: process.env.OPENAI_API_KEY,
      });
      return openai;
   },
};
