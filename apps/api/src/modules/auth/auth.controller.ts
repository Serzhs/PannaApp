import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import {
  ERROR_CODES,
  nestPath,
  refreshBodySchema,
  type ResponseOf,
  type SessionUser,
} from '@panna/shared';

import { AppException } from '../../common/app-exception.js';
import { ZodBody } from '../../common/zod-body.pipe.js';

import { AuthGuard, type AuthedRequest } from './auth.guard.js';
import { AuthService } from './auth.service.js';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post(nestPath('refresh'))
  @HttpCode(200)
  async refresh(
    @Body(new ZodBody(refreshBodySchema)) body: { refreshToken: string },
  ): Promise<ResponseOf<'refresh'>> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post(nestPath('logout'))
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async logout(
    @Body(new ZodBody(refreshBodySchema)) body: { refreshToken: string },
  ): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }

  @Get(nestPath('me'))
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async me(@Req() request: AuthedRequest): Promise<SessionUser> {
    const user =
      request.userId === undefined ? undefined : await this.auth.findUserById(request.userId);
    if (user === undefined) {
      throw new AppException(401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Token names no user');
    }
    return user;
  }
}
