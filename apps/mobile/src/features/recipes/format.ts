import type { Ingredient, Recipe, UnitSystem } from '@panna/shared';
import type { TFunction } from 'i18next';

import { formatAmount } from '@/features/units/format';

const NEW_FOR_MS = 3 * 24 * 60 * 60 * 1000;

/** A recipe made in the last three days is new (0027): long enough to find it again, short enough to mean it. */
export function isNew(recipe: Recipe, now: number = Date.now()): boolean {
  return now - Date.parse(recipe.createdAt) < NEW_FOR_MS;
}

/** "Made 6 times · last on 12 January 2026", counting cooks still waiting to be sent (0014). */
export function describeMade(
  count: number,
  lastAt: string | null,
  t: TFunction,
  language: string,
  now: number = Date.now(),
): string | null {
  if (count === 0 || lastAt === null) return null;
  const last = Date.parse(lastAt);
  const sameDay = new Date(last).toDateString() === new Date(now).toDateString();
  const when = sameDay
    ? t('recipes:made.today')
    : t('recipes:made.lastOn', {
        date: new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(last),
      });
  return `${t('recipes:made.count', { count })} · ${when}`;
}

/** What a screen reader says for a whole row, per the accessibility criteria of 0005. */
export function describeRecipe(recipe: Recipe, t: TFunction, now: number = Date.now()): string {
  const parts = [recipe.title, t('recipes:servings', { count: recipe.servings })];
  if (recipe.totalTimeMinutes !== null) {
    parts.push(t('recipes:minutes', { count: recipe.totalTimeMinutes }));
  }
  if (recipe.status === 'draft') parts.push(t('recipes:status.draft').toLowerCase());
  if (isNew(recipe, now)) parts.push(t('recipes:status.new').toLowerCase());
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
