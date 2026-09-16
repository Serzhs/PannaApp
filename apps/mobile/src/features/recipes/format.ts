import type { Recipe } from '@panna/shared';
import type { TFunction } from 'i18next';

/** What a screen reader says for a whole row, per the accessibility criteria of 0005. */
export function describeRecipe(recipe: Recipe, t: TFunction): string {
  const parts = [recipe.title, t('recipes:servings', { count: recipe.servings })];
  if (recipe.totalTimeMinutes !== null) {
    parts.push(t('recipes:minutes', { count: recipe.totalTimeMinutes }));
  }
  if (recipe.status === 'draft') parts.push(t('recipes:status.draft').toLowerCase());
  return parts.join(', ');
}

/** The line under a title: servings, then time when it is set. */
export function describeMeta(recipe: Recipe, t: TFunction): string {
  const parts = [t('recipes:servings', { count: recipe.servings })];
  if (recipe.totalTimeMinutes !== null) {
    parts.push(t('recipes:minutes', { count: recipe.totalTimeMinutes }));
  }
  return parts.join(' · ');
}
