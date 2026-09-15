import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { devSignInBodySchema, ERROR_CODES, nestPath, type ResponseOf } from '@panna/shared';

import { AppException } from '../../common/app-exception.js';
import { ZodBody } from '../../common/zod-body.pipe.js';

import { AuthService } from './auth.service.js';

/**
 * Development only. This controller is not registered at all unless NODE_ENV is not
 * production and ALLOW_DEV_SIGN_IN is true, so in a real deployment the route is a 404
 * with no handler behind it rather than a handler that checks a flag.
 *
 * It signs in a user the seed already created, and cannot create one, so it reaches
 * accounts that exist rather than minting whatever a caller names.
 */
@Controller()
export class DevAuthController {
  constructor(private readonly auth: AuthService) {}

  @Post(nestPath('devSignIn'))
  @HttpCode(200)
  async devSignIn(
    @Body(new ZodBody(devSignInBodySchema)) body: { email: string },
  ): Promise<ResponseOf<'devSignIn'>> {
    const user = await this.auth.findUserByEmail(body.email);
    if (user === undefined) {
      throw new AppException(
        404,
        ERROR_CODES.AUTH_DEV_USER_NOT_FOUND,
        'No seeded user has that email. Run pnpm db:seed.',
      );
    }
    return this.auth.startSession(user);
  }
}
