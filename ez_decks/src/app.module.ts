import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { PrismaService } from './prisma/prisma.service';
import { WordEngineModule } from './word_engine/word_engine.module';
import { ConfigModule } from '@nestjs/config';
import { DictGeneratorModule } from './dict-generator/dict-generator.module';
import { node_env } from './common/config/constants';

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
