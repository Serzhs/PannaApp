import type { Unit, UnitSystem } from '@panna/shared';
import type { TFunction } from 'i18next';

import { convertAmount, type Amount } from './convert';

/** Cup fractions read as fractions, not as 0.333. */
const VULGAR: ReadonlyMap<number, string> = new Map([
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
  [1.5, '1½'],
  [2.5, '2½'],
]);

function formatNumber(value: number, locale: string): string {
  const vulgar = VULGAR.get(value);
  if (vulgar !== undefined) return vulgar;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

export function formatAmount(
  amount: number,
  unit: Unit,
  system: UnitSystem,
  t: TFunction,
  locale: string,
): string {
  const converted: Amount = convertAmount(amount, unit, system);
  // "¼ cup", not "¼ cups": less than one of something takes the singular in speech.
  const count = converted.amount < 1 ? 1 : converted.amount;
  const text = `${formatNumber(converted.amount, locale)} ${t(`units:${converted.unit}`, { count })}`;
  return converted.approximate ? t('units:approximate', { amount: text }) : text;
}
