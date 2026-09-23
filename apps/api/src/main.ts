import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { API_PREFIX } from '@panna/shared';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { ErrorFilter } from './common/error.filter.js';
import type { Env } from './config/env.js';
import { sharedReadLimit } from './modules/sharing/sharing.controller.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // A body larger than this is rejected before it is parsed. Image uploads in
    // 0010 go through multipart, not here, so this stays small.
    bodyParser: true,
  });

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.useBodyParser('json', { limit: '256kb' });
  // A blanket ceiling. 0003 adds tighter, per-endpoint limits where enumeration
  // and password guessing actually happen.
  app.use(
    rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false }),
  );
  app.use(`/${API_PREFIX}/shared`, sharedReadLimit);
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.enableCors({ origin: false });
  app.useGlobalFilters(new ErrorFilter());

  const config: ConfigService<Env, true> = app.get(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}

bootstrap().catch((error: unknown) => {
  // The environment schema throws here with the offending variable named.
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
