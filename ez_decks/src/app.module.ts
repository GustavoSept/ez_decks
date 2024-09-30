import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { PrismaService } from './prisma/prisma.service';
import { WordEngineModule } from './word_engine/word_engine.module';
import { ConfigModule } from '@nestjs/config';
import { DictGeneratorModule } from './dict-generator/dict-generator.module';

const nodeEnvValues = ['development', 'test', 'production'] as const;
type node_env_choices = (typeof nodeEnvValues)[number];

const isValidNodeEnv = (env: any): env is node_env_choices => {
   return nodeEnvValues.includes(env);
};

const node_env: node_env_choices = isValidNodeEnv(process.env.NODE_ENV) ? (process.env.NODE_ENV as node_env_choices) : 'development';

@Module({
   imports: [
      UserModule,
      WordEngineModule,
      DictGeneratorModule,
      ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: [`.env.${node_env}.local`, '.env'],
         expandVariables: true,
      }),
   ],
   controllers: [AppController],
   providers: [AppService, PrismaService],
})
export class AppModule {}
