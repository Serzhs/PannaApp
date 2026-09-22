import type { RecipeDetail, StepInput } from '@panna/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ImportedRecipe } from './parse';

import { recipeKeys } from '@/features/recipes/queries';
import { createRecipe, updateRecipe } from '@/features/recipes/recipes.api';

/**
 * Two requests: the recipe with its lists, then the steps with links, because a step
 * can only point at an ingredient once that ingredient has an id. A new recipe is a
 * draft by default, which is exactly what an import should be.
 */
export async function importRecipe(recipe: ImportedRecipe): Promise<RecipeDetail> {
  const created = await createRecipe({
    title: recipe.title,
    ...(recipe.description === null ? {} : { description: recipe.description }),
    servings: recipe.servings,
    ingredients: [...recipe.ingredients],
    equipment: [...recipe.equipment],
  });
  if (recipe.steps.length === 0) return created;

  // First match wins for a name that appears twice: the model was asked for exact names.
  const ingredientIds = new Map<string, string>();
  for (const line of created.ingredients) {
    const key = line.name.toLocaleLowerCase();
    if (!ingredientIds.has(key)) ingredientIds.set(key, line.id);
  }
  const equipmentIds = new Map<string, string>();
  for (const line of created.equipment) {
    const key = line.name.toLocaleLowerCase();
    if (!equipmentIds.has(key)) equipmentIds.set(key, line.id);
  }
  const resolve = (names: readonly string[], ids: Map<string, string>): string[] => [
    ...new Set(
      names
        .map((name) => ids.get(name.toLocaleLowerCase()))
        .filter((id): id is string => id !== undefined),
    ),
  ];
  const steps: StepInput[] = recipe.steps.map((step) => ({
    body: step.body,
    note: step.note,
    durationSeconds: step.durationSeconds,
    ingredientIds: resolve(step.ingredientNames, ingredientIds),
    equipmentIds: resolve(step.equipmentNames, equipmentIds),
    children: step.children.map((child) => ({
      body: child.body,
      note: child.note,
      durationSeconds: child.durationSeconds,
      ingredientIds: resolve(child.ingredientNames, ingredientIds),
      equipmentIds: resolve(child.equipmentNames, equipmentIds),
    })),
  }));
  return updateRecipe(created.id, { steps });
}

export function useImportRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: importRecipe,
    onSuccess: async (detail: RecipeDetail) => {
      client.setQueryData(recipeKeys.detail(detail.id), detail);
      await client.invalidateQueries({ queryKey: recipeKeys.list() });
    },
  });
}
