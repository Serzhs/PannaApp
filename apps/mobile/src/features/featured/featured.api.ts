import type { Recipe, RecipeDetail, SharedRecipe } from '@panna/shared';

import { authorizedCall } from '@/api/session';

export async function listFeatured(q: string): Promise<Recipe[]> {
  return authorizedCall('listFeatured', q.length === 0 ? {} : { query: { q } });
}

export async function getFeatured(recipeId: string): Promise<SharedRecipe> {
  return authorizedCall('getFeatured', { params: { recipeId } });
}

export async function saveFeatured(recipeId: string): Promise<RecipeDetail> {
  return authorizedCall('saveFeatured', { params: { recipeId } });
}
