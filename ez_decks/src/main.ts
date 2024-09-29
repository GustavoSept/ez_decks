import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DatabaseInterceptor } from './common/errors/interceptors/database.interceptor';

async function bootstrap() {
   const appPort: string = process.env.NODEAPP_PORT || '4000';

   // TODO: add logic to activate DictGenerator instead of creating the app from AppModule.
   const app = await NestFactory.create(AppModule);

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
