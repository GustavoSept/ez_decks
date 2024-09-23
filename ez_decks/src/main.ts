import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
   const appPort: string = process.env.NODEAPP_PORT || '4000';

   // Now appPort is either a number or undefined
   console.log(`App port is: ${appPort}`);

   const app = await NestFactory.create(AppModule);
   await app.listen(appPort);
}
bootstrap();
