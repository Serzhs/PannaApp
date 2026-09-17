import type { CreateRecipeBody, RecipeDetail, UpdateRecipeBody } from '@panna/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createRecipe, deleteRecipe, getRecipe, listRecipes, updateRecipe } from './recipes.api';

import { useAuth } from '@/features/auth/AuthProvider';

export const recipeKeys = {
  all: ['recipes'] as const,
  list: () => [...recipeKeys.all, 'list'] as const,
  detail: (recipeId: string) => [...recipeKeys.all, 'detail', recipeId] as const,
};

/**
 * False for the one render between signing out and leaving the group, so the queries
 * are paused then rather than fired with no session behind them.
 */
function useSignedIn(): boolean {
  const { session } = useAuth();
  return session !== null && session !== undefined;
}

export function useRecipes() {
  return useQuery({
    queryKey: recipeKeys.list(),
    queryFn: listRecipes,
    enabled: useSignedIn(),
  });
}

export function useRecipe(recipeId: string) {
  return useQuery({
    queryKey: recipeKeys.detail(recipeId),
    queryFn: () => getRecipe(recipeId),
    enabled: useSignedIn(),
  });
}

export function useCreateRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRecipeBody) => createRecipe(body),
    onSuccess: async (recipe: RecipeDetail) => {
      client.setQueryData(recipeKeys.detail(recipe.id), recipe);
      await client.invalidateQueries({ queryKey: recipeKeys.list() });
    },
  });
}

export function useUpdateRecipe(recipeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateRecipeBody) => updateRecipe(recipeId, body),
    onSuccess: async (recipe: RecipeDetail) => {
      client.setQueryData(recipeKeys.detail(recipe.id), recipe);
      await client.invalidateQueries({ queryKey: recipeKeys.list() });
    },
  });
}

export function useDeleteRecipe(recipeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => deleteRecipe(recipeId),
    onSuccess: async () => {
      client.removeQueries({ queryKey: recipeKeys.detail(recipeId) });
      await client.invalidateQueries({ queryKey: recipeKeys.list() });
    },
  });
}
