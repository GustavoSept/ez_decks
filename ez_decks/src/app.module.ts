import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { WordEngineModule } from './word_engine/word_engine.module';
import { PrismaService } from './prisma/prisma.service';
import { DatabaseInterceptor } from './common/errors/interceptors/database.interceptor';
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
   providers: [
      AppService,
      PrismaService,
      {
         provide: APP_PIPE,
         useValue: new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
         }),
      },
      {
         provide: APP_INTERCEPTOR,
         useClass: DatabaseInterceptor,
      },
   ],
})
export class AppModule {}
