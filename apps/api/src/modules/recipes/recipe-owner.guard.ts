import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@panna/shared';
import { z } from 'zod';

import { AppException } from '../../common/app-exception.js';
import type { AuthedRequest } from '../auth/auth.guard.js';

import { RecipesService, type RecipeRow } from './recipes.service.js';

export interface RecipeRequest extends AuthedRequest {
  recipe?: RecipeRow;
}

/**
 * One 404 for "does not exist" and "belongs to someone else", built in one place so the
 * two bodies cannot drift apart. A 403 would confirm the recipe exists, which is an
 * answer nobody asked for.
 */
export function recipeNotFound(): AppException {
  return new AppException(404, ERROR_CODES.RECIPE_NOT_FOUND, 'No such recipe');
}

const recipeIdSchema = z.string().uuid();

/**
 * Runs after AuthGuard on every route carrying a recipe id. Ownership is decided here
 * and nowhere else, per the Security section of CLAUDE.md, and the row it loads travels
 * on the request so the handler does not look it up a second time.
 */
@Injectable()
export class RecipeOwnerGuard implements CanActivate {
  constructor(private readonly recipes: RecipesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RecipeRequest>();
    const id = recipeIdSchema.safeParse(request.params.recipeId);
    // A malformed id is indistinguishable from an unknown one on purpose.
    if (!id.success || request.userId === undefined) throw recipeNotFound();

    const recipe = await this.recipes.findOwned(id.data, request.userId);
    if (recipe === undefined) throw recipeNotFound();

    request.recipe = recipe;
    return true;
  }
}
