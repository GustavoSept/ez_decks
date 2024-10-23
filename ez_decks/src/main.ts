import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { node_env } from './common/config/constants';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { join } from 'path';
import * as handlebars from 'handlebars';
import view from '@fastify/view';
import fastifyStatic from '@fastify/static';

async function bootstrap() {
   console.log(`\n\nRunning on ${node_env} environment!\n\n`);
   // Create the app from AppModule
   const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({ logger: true })
   );

   // Get the ConfigService instance
   const configService = app.get(ConfigService);

   // Retrieve the port from ConfigService (with a fallback to 4000)
   const appPort = configService.get<string>('NODEAPP_PORT', '4000');

   app.register(view, {
      engine: {
         handlebars,
      },
      root: join(__dirname, '..', 'views'),
      viewExt: 'hbs',
   });

   app.register(fastifyStatic, {
      root: join(__dirname, '..', 'public'),
      prefix: '/public/',
   });
   await app.listen({ port: Number(appPort), host: '0.0.0.0' });
}

bootstrap();
