import type {
  AddNoteBody,
  Cook,
  CookNote,
  CreateRecipeBody,
  RecipeDetail,
  UpdateRecipeBody,
} from '@panna/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addNote,
  createRecipe,
  deleteRecipe,
  getRecipe,
  listCooks,
  listRecipes,
  saveShared,
  shareRecipe,
  unshareRecipe,
  updateRecipe,
} from './recipes.api';

import { useAuth } from '@/features/auth/AuthProvider';

export const recipeKeys = {
  all: ['recipes'] as const,
  list: () => [...recipeKeys.all, 'list'] as const,
  detail: (recipeId: string) => [...recipeKeys.all, 'detail', recipeId] as const,
  cooks: (recipeId: string) => [...recipeKeys.all, 'cooks', recipeId] as const,
};

/**
 * False for the one render between signing out and leaving the group, so the queries
 * are paused then rather than fired with no session behind them.
 */
export function useSignedIn(): boolean {
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

/** A note written later needs a connection (0015); the detail is refreshed so it shows at the top. */
/** 0029. Every time it was made, newest first; the notes come from the detail, not from here. */
export function useCookHistory(recipeId: string) {
  return useQuery({
    queryKey: recipeKeys.cooks(recipeId),
    queryFn: async (): Promise<Cook[]> =>
      (await listCooks(recipeId)).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    enabled: useSignedIn(),
  });
}

export function useAddNote(recipeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: AddNoteBody) => addNote(recipeId, body),
    onSuccess: (note: CookNote) => {
      client.setQueryData<RecipeDetail>(recipeKeys.detail(recipeId), (current) =>
        current === undefined ? current : { ...current, notes: [note, ...current.notes] },
      );
    },
  });
}

/** 0017. The link, made once; the detail learns the token so the screen can say it is shared. */
export function useShareRecipe(recipeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => shareRecipe(recipeId),
    onSuccess: (link) => {
      client.setQueryData<RecipeDetail>(recipeKeys.detail(recipeId), (current) =>
        current === undefined ? current : { ...current, shareToken: link.token },
      );
    },
  });
}

export function useUnshareRecipe(recipeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => unshareRecipe(recipeId),
    onSuccess: () => {
      client.setQueryData<RecipeDetail>(recipeKeys.detail(recipeId), (current) =>
        current === undefined ? current : { ...current, shareToken: null },
      );
    },
  });
}

export function useSaveShared() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => saveShared(token),
    onSuccess: async (copy: RecipeDetail) => {
      client.setQueryData(recipeKeys.detail(copy.id), copy);
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
