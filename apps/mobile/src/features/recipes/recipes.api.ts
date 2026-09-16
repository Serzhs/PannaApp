import type { CreateRecipeBody, Recipe, UpdateRecipeBody } from '@panna/shared';

import { authorizedCall } from '@/api/session';

export async function listRecipes(): Promise<Recipe[]> {
  return authorizedCall('listRecipes');
}

export async function getRecipe(recipeId: string): Promise<Recipe> {
  return authorizedCall('getRecipe', { params: { recipeId } });
}

export async function createRecipe(body: CreateRecipeBody): Promise<Recipe> {
  return authorizedCall('createRecipe', { body });
}

export async function updateRecipe(recipeId: string, body: UpdateRecipeBody): Promise<Recipe> {
  return authorizedCall('updateRecipe', { params: { recipeId }, body });
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  await authorizedCall('deleteRecipe', { params: { recipeId } });
}
