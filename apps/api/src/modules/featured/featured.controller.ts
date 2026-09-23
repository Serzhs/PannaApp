import { Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { featuredQuerySchema, nestPath, type FeaturedQuery, type ResponseOf } from '@panna/shared';
import { z } from 'zod';

import { ZodBody } from '../../common/zod-body.pipe.js';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard.js';
import { recipeNotFound } from '../recipes/recipe-owner.guard.js';
import { RecipesService } from '../recipes/recipes.service.js';

const idSchema = z.string().uuid();

/**
 * The recipes we wrote (0019). Any signed-in person may read them, so there is no owner
 * guard; an id that is not featured answers exactly like one that does not exist.
 */
@Controller()
@UseGuards(AuthGuard)
export class FeaturedController {
  constructor(private readonly recipes: RecipesService) {}

  @Get(nestPath('listFeatured'))
  async list(
    @Query(new ZodBody(featuredQuerySchema)) query: FeaturedQuery,
  ): Promise<ResponseOf<'listFeatured'>> {
    return this.recipes.listFeatured(query.q);
  }

  @Get(nestPath('getFeatured'))
  async get(@Param('recipeId') id: string): Promise<ResponseOf<'getFeatured'>> {
    if (!idSchema.safeParse(id).success) throw recipeNotFound();
    const found = await this.recipes.findFeatured(id);
    if (found === undefined) throw recipeNotFound();
    return found;
  }

  @Post(nestPath('saveFeatured'))
  @HttpCode(201)
  async save(
    @Param('recipeId') id: string,
    @Req() request: AuthedRequest,
  ): Promise<ResponseOf<'saveFeatured'>> {
    if (request.userId === undefined || !idSchema.safeParse(id).success) throw recipeNotFound();
    const copy = await this.recipes.saveFeatured(id, request.userId);
    if (copy === undefined) throw recipeNotFound();
    return copy;
  }
}
