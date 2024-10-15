import { Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { OpenAIProvider } from './providers';
import { BatchService } from './batch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService } from './files/files.service';
import { FilesController } from './files/files.controller';

/**
 * This module implements the OpenAI SDK.
 *
 * Exposes `FilesController` and `OpenaiService`.
 */
@Module({
   providers: [OpenaiService, OpenAIProvider, BatchService, PrismaService, FilesService],
   exports: [OpenaiService],
   controllers: [FilesController],
})
export class OpenaiModule {}
