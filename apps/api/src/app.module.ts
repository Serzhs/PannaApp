import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { config as loadDotenv } from 'dotenv';
import { LoggerModule } from 'nestjs-pino';

import type { Env } from './config/env.js';
import { validateEnv } from './config/env.js';
import { DatabaseModule } from './db/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { FeaturedModule } from './modules/featured/featured.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ImagesModule } from './modules/images/images.module.js';
import { RecipesModule } from './modules/recipes/recipes.module.js';
import { SharingModule } from './modules/sharing/sharing.module.js';
import { UsersModule } from './modules/users/users.module.js';

const ENV_FILE = '../../.env';

/**
 * Nest builds the module list before ConfigModule has read the .env file, and whether
 * the development sign-in route exists is a build-the-module-list decision rather than
 * a runtime one. So the environment is loaded and validated once here, and the same
 * validation runs again through ConfigModule for everything injected later.
 */
loadDotenv({ path: ENV_FILE, quiet: true });
const env = validateEnv(process.env);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // One .env at the repo root, so the API and drizzle-kit read the same file.
      envFilePath: ENV_FILE,
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          // Redaction is configuration, not something to remember at each call site.
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.idToken',
              'req.body.refreshToken',
              'res.headers["set-cookie"]',
            ],
            censor: '[redacted]',
          },
          ...(config.get('NODE_ENV', { infer: true }) === 'development'
            ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
            : {}),
        },
      }),
    }),
    DatabaseModule,
    HealthModule,
    ImagesModule,
    AuthModule.register(env),
    RecipesModule,
    FeaturedModule,
    SharingModule,
    UsersModule,
  ],
})
export class AppModule {}
