import { Inject, Injectable } from '@nestjs/common';
import { OPENAI_SDK } from './constants';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenaiService {
   constructor(
      @Inject(OPENAI_SDK) private readonly openai: OpenAI,
      private readonly configService: ConfigService
   ) {}

   async query(
      userMsg: string,
      systemMsg: string = 'You are a helpful assistant.',
      maxOutput: number = 2048,
      model: string = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini')
   ) {
      const completion = await this.openai.chat.completions.create({
         model: model,
         messages: [
            { role: 'system', content: systemMsg },
            {
               role: 'user',
               content: userMsg,
            },
         ],
         max_completion_tokens: maxOutput,
      });

      return completion.choices[0].message;
   }
}
