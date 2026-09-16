import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createRecipeBodySchema,
  nestPath,
  updateRecipeBodySchema,
  type CreateRecipeBody,
  type ResponseOf,
  type UpdateRecipeBody,
} from '@panna/shared';

import { AppException } from '../../common/app-exception.js';
import { ZodBody } from '../../common/zod-body.pipe.js';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard.js';

import { RecipeOwnerGuard, recipeNotFound, type RecipeRequest } from './recipe-owner.guard.js';
import { RecipesService, toRecipe } from './recipes.service.js';

function caller(request: AuthedRequest): string {
  if (request.userId === undefined) {
    throw new AppException(401, 'AUTH_TOKEN_INVALID', 'No caller on the request');
  }
  return request.userId;
}

function owned(request: RecipeRequest) {
  if (request.recipe === undefined) throw recipeNotFound();
  return request.recipe;
}

@Controller()
@UseGuards(AuthGuard)
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @Get(nestPath('listRecipes'))
  async list(@Req() request: AuthedRequest): Promise<ResponseOf<'listRecipes'>> {
    return this.recipes.list(caller(request));
  }

  @Post(nestPath('createRecipe'))
  @HttpCode(201)
  async create(
    @Req() request: AuthedRequest,
    @Body(new ZodBody(createRecipeBodySchema)) body: CreateRecipeBody,
  ): Promise<ResponseOf<'createRecipe'>> {
    return this.recipes.create(caller(request), body);
  }

  @Get(nestPath('getRecipe'))
  @UseGuards(RecipeOwnerGuard)
  get(@Req() request: RecipeRequest): ResponseOf<'getRecipe'> {
    return toRecipe(owned(request));
  }

  @Patch(nestPath('updateRecipe'))
  @UseGuards(RecipeOwnerGuard)
  async update(
    @Req() request: RecipeRequest,
    @Body(new ZodBody(updateRecipeBodySchema)) body: UpdateRecipeBody,
  ): Promise<ResponseOf<'updateRecipe'>> {
    const updated = await this.recipes.update(owned(request).id, body);
    // Deleted between the guard and the write: gone is gone.
    if (updated === undefined) throw recipeNotFound();
    return updated;
  }

  @Delete(nestPath('deleteRecipe'))
  @HttpCode(204)
  @UseGuards(RecipeOwnerGuard)
  async remove(@Req() request: RecipeRequest): Promise<void> {
    if (!(await this.recipes.remove(owned(request).id))) throw recipeNotFound();
  }
}
