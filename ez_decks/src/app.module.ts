import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { PrismaService } from './prisma/prisma.service';
import { WordEngineModule } from './word_engine/word_engine.module';

@Module({
   imports: [UserModule, WordEngineModule],
   controllers: [AppController],
   providers: [AppService, PrismaService],
})
export class AppModule {}
