import type { CreateRecipeBody, Recipe, UpdateRecipeBody } from '@panna/shared';

import { authorized, call } from '@/api/client';

export async function listRecipes(accessToken: string): Promise<Recipe[]> {
  return call('listRecipes', { headers: authorized(accessToken) });
}

export async function getRecipe(accessToken: string, recipeId: string): Promise<Recipe> {
  return call('getRecipe', { params: { recipeId }, headers: authorized(accessToken) });
}

export async function createRecipe(accessToken: string, body: CreateRecipeBody): Promise<Recipe> {
  return call('createRecipe', { body, headers: authorized(accessToken) });
}

export async function updateRecipe(
  accessToken: string,
  recipeId: string,
  body: UpdateRecipeBody,
): Promise<Recipe> {
  return call('updateRecipe', { params: { recipeId }, body, headers: authorized(accessToken) });
}

export async function deleteRecipe(accessToken: string, recipeId: string): Promise<void> {
  await call('deleteRecipe', { params: { recipeId }, headers: authorized(accessToken) });
}
