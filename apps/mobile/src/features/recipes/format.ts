import type { Ingredient, Recipe, UnitSystem } from '@panna/shared';
import type { TFunction } from 'i18next';

import { formatAmount } from '@/features/units/format';

/** What a screen reader says for a whole row, per the accessibility criteria of 0005. */
export function describeRecipe(recipe: Recipe, t: TFunction): string {
  const parts = [recipe.title, t('recipes:servings', { count: recipe.servings })];
  if (recipe.totalTimeMinutes !== null) {
    parts.push(t('recipes:minutes', { count: recipe.totalTimeMinutes }));
  }
  if (recipe.status === 'draft') parts.push(t('recipes:status.draft').toLowerCase());
  return parts.join(', ');
}

/** "45 min", "2 h", "1 h 30 min": the way a cook says it, never raw seconds. */
export function formatDuration(seconds: number, t: TFunction): string {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return t('recipes:steps.minutes', { count: minutes });
  if (rest === 0) return t('recipes:steps.hours', { count: hours });
  return t('recipes:steps.hoursMinutes', { hours, minutes: rest });
}

/** The line under a title: servings, then time when it is set. */
export function describeMeta(recipe: Recipe, t: TFunction): string {
  const parts = [t('recipes:servings', { count: recipe.servings })];
  if (recipe.totalTimeMinutes !== null) {
    parts.push(t('recipes:minutes', { count: recipe.totalTimeMinutes }));
  }
  return parts.join(' · ');
}

/** "500 g beetroot", or just "beetroot" for an unmeasured line: the amount in the reader's units. */
export function describeIngredient(
  line: Ingredient,
  system: UnitSystem,
  t: TFunction,
  language: string,
): string {
  if (line.amount === null) return line.name;
  const amount =
    line.unit === null
      ? new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(line.amount)
      : formatAmount(line.amount, line.unit, system, t, language);
  return `${amount} ${line.name}`;
}
