import type { CreateRecipeBody, Recipe, UpdateRecipeBody } from '@panna/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createRecipe, deleteRecipe, getRecipe, listRecipes, updateRecipe } from './recipes.api';

import { useAuth } from '@/features/auth/AuthProvider';

export const recipeKeys = {
  all: ['recipes'] as const,
  list: () => [...recipeKeys.all, 'list'] as const,
  detail: (recipeId: string) => [...recipeKeys.all, 'detail', recipeId] as const,
};

/**
 * Empty for the one render between signing out and leaving the group; the queries are
 * disabled then rather than fired with no token.
 */
function useAccessToken(): string {
  const { session } = useAuth();
  return session?.accessToken ?? '';
}

export function useRecipes() {
  const token = useAccessToken();
  return useQuery({
    queryKey: recipeKeys.list(),
    queryFn: () => listRecipes(token),
    enabled: token.length > 0,
  });
}

export function useRecipe(recipeId: string) {
  const token = useAccessToken();
  return useQuery({
    queryKey: recipeKeys.detail(recipeId),
    queryFn: () => getRecipe(token, recipeId),
    enabled: token.length > 0,
  });
}

export function useCreateRecipe() {
  const token = useAccessToken();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRecipeBody) => createRecipe(token, body),
    onSuccess: async (recipe: Recipe) => {
      client.setQueryData(recipeKeys.detail(recipe.id), recipe);
      await client.invalidateQueries({ queryKey: recipeKeys.list() });
    },
  });
}

export function useUpdateRecipe(recipeId: string) {
  const token = useAccessToken();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateRecipeBody) => updateRecipe(token, recipeId, body),
    onSuccess: async (recipe: Recipe) => {
      client.setQueryData(recipeKeys.detail(recipe.id), recipe);
      await client.invalidateQueries({ queryKey: recipeKeys.list() });
    },
  });
}

export function useDeleteRecipe(recipeId: string) {
  const token = useAccessToken();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => deleteRecipe(token, recipeId),
    onSuccess: async () => {
      client.removeQueries({ queryKey: recipeKeys.detail(recipeId) });
      await client.invalidateQueries({ queryKey: recipeKeys.list() });
    },
  });
}
