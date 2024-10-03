import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { node_env } from './common/config/constants';

async function bootstrap() {
   console.log(`\n\nRunning on ${node_env} environment!\n\n`);
   // Create the app from AppModule
   const app = await NestFactory.create(AppModule);

   // Get the ConfigService instance
   const configService = app.get(ConfigService);

   // Retrieve the port from ConfigService (with a fallback to 4000)
   const appPort = configService.get<string>('NODEAPP_PORT', '4000');

   await app.listen(appPort);
}

bootstrap();
