import { Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ERROR_CODES, nestPath, shareTokenSchema, type ResponseOf } from '@panna/shared';
import rateLimit from 'express-rate-limit';

import { AppException } from '../../common/app-exception.js';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard.js';
import { RecipesService } from '../recipes/recipes.service.js';

function shareNotFound(): AppException {
  return new AppException(404, ERROR_CODES.SHARE_NOT_FOUND, 'This link no longer works');
}

/** Tighter than the blanket limit: this is the one route anyone can hit without signing in. */
export const sharedReadLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/**
 * The public share route is separate from the recipes controller (0017): it carries no
 * AuthGuard, and the token is the whole permission check. A malformed token answers
 * exactly like an unknown one, so nothing about the store leaks.
 */
@Controller()
export class SharingController {
  constructor(private readonly recipes: RecipesService) {}

  @Get(nestPath('getShared'))
  async get(@Param('token') token: string): Promise<ResponseOf<'getShared'>> {
    if (!shareTokenSchema.safeParse(token).success) throw shareNotFound();
    const shared = await this.recipes.findShared(token);
    if (shared === undefined) throw shareNotFound();
    return shared;
  }

  @Post(nestPath('saveShared'))
  @HttpCode(201)
  @UseGuards(AuthGuard)
  async save(
    @Param('token') token: string,
    @Req() request: AuthedRequest,
  ): Promise<ResponseOf<'saveShared'>> {
    if (!shareTokenSchema.safeParse(token).success || request.userId === undefined) {
      throw shareNotFound();
    }
    const copy = await this.recipes.saveShared(token, request.userId);
    if (copy === undefined) throw shareNotFound();
    return copy;
  }
}
