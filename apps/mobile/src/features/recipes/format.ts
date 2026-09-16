import type { Recipe } from '@panna/shared';

/**
 * Plain English until 0006 brings i18next and proper plural rules. Kept in one place so
 * the row, the detail screen and their accessibility labels cannot drift apart.
 */
export function describeServings(servings: number): string {
  return servings === 1 ? '1 serving' : `${String(servings)} servings`;
}

export function describeTime(totalTimeMinutes: number): string {
  return `${String(totalTimeMinutes)} min`;
}

/** What a screen reader says for a whole row, per the accessibility criteria of 0005. */
export function describeRecipe(recipe: Recipe): string {
  const parts = [recipe.title, describeServings(recipe.servings)];
  if (recipe.totalTimeMinutes !== null) parts.push(describeTime(recipe.totalTimeMinutes));
  if (recipe.status === 'draft') parts.push('draft');
  return parts.join(', ');
}
