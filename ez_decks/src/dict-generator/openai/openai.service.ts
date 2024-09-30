import { Inject, Injectable } from '@nestjs/common';
import { OPENAI_SDK } from './constants';
import OpenAI from 'openai';

@Injectable()
export class OpenaiService {
   constructor(@Inject(OPENAI_SDK) private readonly openai: OpenAI) {}

   query(/*input: string , maxOutput: number = 1024*/) {
      console.log(this.openai);
   }
}
