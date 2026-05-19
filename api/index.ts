import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { Request, Response } from 'express';

const server = express();
let isReady = false;

async function bootstrap() {
  if (isReady) return;
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), { logger: false });
  app.enableCors({
    origin: 'https://one-mark-frontend.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  await app.init();
  isReady = true;
}

export default async (req: Request, res: Response) => {
  await bootstrap();
  server(req, res);
};
