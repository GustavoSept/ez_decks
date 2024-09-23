import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
   const appPort: string = process.env.NODEAPP_PORT || '4000';

   const app = await NestFactory.create(AppModule);

   app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

   await app.listen(appPort);
}
bootstrap();
