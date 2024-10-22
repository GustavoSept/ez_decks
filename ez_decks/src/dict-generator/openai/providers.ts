import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OPENAI_SDK } from './constants';
import OpenAI from 'openai';

export const OpenAIProvider: Provider = {
   provide: OPENAI_SDK,
   useFactory: (configService: ConfigService) => {
      const openai = new OpenAI({
         apiKey: configService.get<string>('OPENAI_API_KEY'),
         timeout: 60_000 * 61 * 24, // 24 hours
      });
      return openai;
   },
   inject: [ConfigService],
};
