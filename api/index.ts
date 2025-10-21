import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../apps/api/src/app/app.module';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let app: NestFastifyApplication;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({
        disableRequestLogging: process.env.APP_ENV === 'production',
        bodyLimit: 100 * 1024 * 1024,
      }),
      { rawBody: true },
    );

    app.enableCors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    await app.init();
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await bootstrap();
  await app.ready();

  // @ts-ignore
  app.getHttpAdapter().getInstance().handler(req, res);
}
