import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@panna/shared';
import type { Request } from 'express';

import { AppException } from '../../common/app-exception.js';

import { AuthService } from './auth.service.js';
import { TokensService } from './tokens.service.js';

/** Set by the guard so a controller reads the caller without re-verifying the token. */
export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Authorisation is checked in a guard rather than inside service methods scattered
 * around, per the Security section of CLAUDE.md.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new AppException(401, ERROR_CODES.AUTH_TOKEN_INVALID, 'No bearer token');
    }

    let userId: string;
    try {
      userId = this.tokens.verifyAccessToken(header.slice('Bearer '.length)).sub;
    } catch (error) {
      const expired = error instanceof Error && error.name === 'TokenExpiredError';
      throw new AppException(
        401,
        expired ? ERROR_CODES.AUTH_TOKEN_EXPIRED : ERROR_CODES.AUTH_TOKEN_INVALID,
        expired ? 'Access token has expired' : 'Access token is not valid',
      );
    }

    // A token can outlive the user it names, so existence is checked rather than assumed.
    const user = await this.auth.findUserById(userId);
    if (user === undefined) {
      throw new AppException(401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Token names no user');
    }

    request.userId = userId;
    return true;
  }
}
