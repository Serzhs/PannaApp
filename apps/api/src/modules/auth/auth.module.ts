import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import type { Env } from '../../config/env.js';
import { DatabaseModule } from '../../db/database.module.js';

import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { DevAuthController } from './dev-auth.controller.js';
import { TokensService } from './tokens.service.js';

/**
 * Whether the development sign-in exists at all. Gate one of three: when this is false
 * the controller is never put in the module, so there is no handler to reach and the
 * route is an ordinary 404 - not a handler that checks a flag and could stop checking.
 *
 * Gate two is the environment schema, which refuses to boot on production plus the
 * flag. Gate three is the client, where the button is compiled out of a release bundle.
 */
export function devSignInEnabled(env: Pick<Env, 'NODE_ENV' | 'ALLOW_DEV_SIGN_IN'>): boolean {
  return env.ALLOW_DEV_SIGN_IN && env.NODE_ENV !== 'production';
}

@Module({})
export class AuthModule {
  static register(env: Pick<Env, 'NODE_ENV' | 'ALLOW_DEV_SIGN_IN'>): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        DatabaseModule,
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService<Env, true>) => ({
            secret: config.get('JWT_SECRET', { infer: true }),
            signOptions: { algorithm: 'HS256' },
            // Never accept a token whose header claims it is unsigned.
            verifyOptions: { algorithms: ['HS256'] },
          }),
        }),
      ],
      controllers: devSignInEnabled(env) ? [AuthController, DevAuthController] : [AuthController],
      providers: [AuthService, TokensService, AuthGuard],
      exports: [AuthService, TokensService, AuthGuard],
    };
  }
}
