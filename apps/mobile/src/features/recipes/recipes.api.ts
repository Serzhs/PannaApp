import type {
  AddNoteBody,
  CookNote,
  CreateRecipeBody,
  Recipe,
  RecipeDetail,
  UpdateRecipeBody,
} from '@panna/shared';

import { authorizedCall } from '@/api/session';

export async function listRecipes(): Promise<Recipe[]> {
  return authorizedCall('listRecipes');
}

export async function getRecipe(recipeId: string): Promise<RecipeDetail> {
  return authorizedCall('getRecipe', { params: { recipeId } });
}

export async function createRecipe(body: CreateRecipeBody): Promise<RecipeDetail> {
  return authorizedCall('createRecipe', { body });
}

export async function updateRecipe(
  recipeId: string,
  body: UpdateRecipeBody,
): Promise<RecipeDetail> {
  return authorizedCall('updateRecipe', { params: { recipeId }, body });
}

export async function addNote(recipeId: string, body: AddNoteBody): Promise<CookNote> {
  return authorizedCall('addNote', { params: { recipeId }, body });
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  await authorizedCall('deleteRecipe', { params: { recipeId } });
}
