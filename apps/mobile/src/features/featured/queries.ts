import type { RecipeDetail } from '@panna/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getFeatured, listFeatured, saveFeatured } from './featured.api';

import { recipeKeys, useSignedIn } from '@/features/recipes/queries';

export const featuredKeys = {
  all: ['featured'] as const,
  list: (q: string) => [...featuredKeys.all, 'list', q] as const,
  detail: (recipeId: string) => [...featuredKeys.all, 'detail', recipeId] as const,
};

/** The list for one search; each query is its own entry, so going back to a word is instant. */
export function useFeatured(q: string) {
  return useQuery({
    queryKey: featuredKeys.list(q),
    queryFn: () => listFeatured(q),
    enabled: useSignedIn(),
  });
}

export function useFeaturedRecipe(recipeId: string) {
  return useQuery({
    queryKey: featuredKeys.detail(recipeId),
    queryFn: () => getFeatured(recipeId),
    enabled: useSignedIn(),
  });
}

/** The copy lands in the own list, so that list is stale the moment this succeeds. */
export function useSaveFeatured() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => saveFeatured(recipeId),
    onSuccess: async (copy: RecipeDetail) => {
      client.setQueryData(recipeKeys.detail(copy.id), copy);
      await client.invalidateQueries({ queryKey: recipeKeys.list() });
    },
  });
}
