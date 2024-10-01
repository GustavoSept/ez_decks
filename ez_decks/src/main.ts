import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DatabaseInterceptor } from './common/errors/interceptors/database.interceptor';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
   // Create the app from AppModule
   const app = await NestFactory.create(AppModule);

   // Get the ConfigService instance
   const configService = app.get(ConfigService);

   // Retrieve the port from ConfigService (with a fallback to 4000)
   const appPort = configService.get<string>('NODEAPP_PORT', '4000');

   app.useGlobalPipes(
      new ValidationPipe({
         whitelist: true,
         forbidNonWhitelisted: true,
         transform: true,
      })
   );

   app.useGlobalInterceptors(new DatabaseInterceptor());

   await app.listen(appPort);
}

bootstrap();
