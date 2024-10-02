import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OPENAI_SDK } from './constants';
import OpenAI from 'openai';
import { ZodSchema } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

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
   ): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
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

   async structuredQuery<T>(
      userMsg: string,
      struct: ZodSchema<T>,
      structName: string = 'response',
      systemMsg: string = 'You are a helpful assistant.',
      maxOutput: number = 2048,
      model: string = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini')
   ): Promise<T> {
      const completion = await this.openai.beta.chat.completions.parse({
         model: model,
         messages: [
            { role: 'system', content: systemMsg },
            {
               role: 'user',
               content: userMsg,
            },
         ],
         max_completion_tokens: maxOutput,
         response_format: zodResponseFormat(struct, structName),
      });

      return completion.choices[0].message.parsed as T;
   }
}
