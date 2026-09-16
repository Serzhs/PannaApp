import { COUNT_UNITS, MASS_UNITS, VOLUME_UNITS, type Unit, type UnitSystem } from '@panna/shared';

export type Dimension = 'mass' | 'volume' | 'count';

export function dimensionOf(unit: Unit): Dimension {
  if ((MASS_UNITS as readonly string[]).includes(unit)) return 'mass';
  if ((VOLUME_UNITS as readonly string[]).includes(unit)) return 'volume';
  return 'count';
}

export interface Amount {
  readonly amount: number;
  readonly unit: Unit;
  /** True when the number was converted, so the UI can say "about". */
  readonly approximate: boolean;
}

const GRAMS_PER_OZ = 28.3495;
const GRAMS_PER_LB = 453.592;
const ML_PER_TSP = 4.92892;
const ML_PER_TBSP = 14.7868;
const ML_PER_FLOZ = 29.5735;
const ML_PER_CUP = 236.588;

/** How far off a tidy fraction may be and still be shown: 250 ml is "1 cup" at 5.7%. */
const FRACTION_TOLERANCE = 0.08;
/** Cup amounts a person would actually say. */
const CUP_FRACTIONS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.5, 2, 2.5, 3, 4];

const NATIVE_SYSTEM: Record<Unit, UnitSystem | null> = {
  g: 'metric',
  kg: 'metric',
  oz: 'imperial',
  lb: 'imperial',
  ml: 'metric',
  l: 'metric',
  tsp: 'imperial',
  tbsp: 'imperial',
  cup: 'imperial',
  floz: 'imperial',
  piece: null,
  pinch: null,
  clove: null,
  slice: null,
};

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** One decimal reads as approximate; below one unit a second keeps a pinch from becoming zero. */
function sensible(value: number): number {
  return round(value, value < 1 ? 2 : 1);
}

/** Small metric amounts to the nearest half: 2 tsp is 10 ml, not 9.9. */
function toHalf(value: number): number {
  return value < 1 ? sensible(value) : Math.round(value * 2) / 2;
}

function toGrams(amount: number, unit: Unit): number {
  switch (unit) {
    case 'g':
      return amount;
    case 'kg':
      return amount * 1000;
    case 'oz':
      return amount * GRAMS_PER_OZ;
    case 'lb':
      return amount * GRAMS_PER_LB;
    default:
      throw new Error(`${unit} is not a mass`);
  }
}

function toMillilitres(amount: number, unit: Unit): number {
  switch (unit) {
    case 'ml':
      return amount;
    case 'l':
      return amount * 1000;
    case 'tsp':
      return amount * ML_PER_TSP;
    case 'tbsp':
      return amount * ML_PER_TBSP;
    case 'cup':
      return amount * ML_PER_CUP;
    case 'floz':
      return amount * ML_PER_FLOZ;
    default:
      throw new Error(`${unit} is not a volume`);
  }
}

function nearestTidy(value: number, candidates: readonly number[]): number | null {
  let best: number | null = null;
  for (const candidate of candidates) {
    const off = Math.abs(value - candidate) / candidate;
    if (off <= FRACTION_TOLERANCE && (best === null || off < Math.abs(value - best) / best)) {
      best = candidate;
    }
  }
  return best;
}

function massToImperial(grams: number): Amount {
  if (grams >= GRAMS_PER_LB) {
    return { amount: sensible(grams / GRAMS_PER_LB), unit: 'lb', approximate: true };
  }
  return { amount: sensible(grams / GRAMS_PER_OZ), unit: 'oz', approximate: true };
}

function massToMetric(grams: number): Amount {
  if (grams >= 1000) return { amount: round(grams / 1000, 2), unit: 'kg', approximate: true };
  // Nobody weighs to the gram from a converted number: the nearest 5 g is honest,
  // except for the small amounts where 5 g would swallow the whole quantity.
  if (grams < 20) return { amount: toHalf(grams), unit: 'g', approximate: true };
  return { amount: Math.round(grams / 5) * 5, unit: 'g', approximate: true };
}

/**
 * Spoons for small amounts, a tidy cup fraction where one is close, and fluid ounces
 * otherwise - "3/4 cup minus a teaspoon" is not something anyone says.
 */
function volumeToImperial(ml: number): Amount {
  if (ml < ML_PER_TBSP * 3) {
    // A tablespoon before three teaspoons: it is what the reader would reach for.
    const tidyTbsp = nearestTidy(ml / ML_PER_TBSP, [1, 1.5, 2]);
    if (tidyTbsp !== null) return { amount: tidyTbsp, unit: 'tbsp', approximate: true };
    const tidyTsp = nearestTidy(ml / ML_PER_TSP, [0.125, 0.25, 0.5, 1, 1.5, 2]);
    if (tidyTsp !== null) return { amount: tidyTsp, unit: 'tsp', approximate: true };
  }
  const tidyCup = nearestTidy(ml / ML_PER_CUP, CUP_FRACTIONS);
  if (tidyCup !== null) return { amount: tidyCup, unit: 'cup', approximate: true };
  return { amount: sensible(ml / ML_PER_FLOZ), unit: 'floz', approximate: true };
}

function volumeToMetric(ml: number): Amount {
  if (ml >= 1000) return { amount: round(ml / 1000, 2), unit: 'l', approximate: true };
  if (ml < 30) return { amount: toHalf(ml), unit: 'ml', approximate: true };
  return { amount: Math.round(ml / 5) * 5, unit: 'ml', approximate: true };
}

/**
 * Display only: the stored value never changes. Conversion stays inside a dimension -
 * a volume never becomes a mass, because that needs the ingredient's density and a
 * guess is a confidently wrong recipe. Count units are never converted at all.
 */
export function convertAmount(amount: number, unit: Unit, system: UnitSystem): Amount {
  const native = NATIVE_SYSTEM[unit];
  if (native === null || native === system) return { amount, unit, approximate: false };

  if (dimensionOf(unit) === 'mass') {
    const grams = toGrams(amount, unit);
    return system === 'imperial' ? massToImperial(grams) : massToMetric(grams);
  }
  const ml = toMillilitres(amount, unit);
  return system === 'imperial' ? volumeToImperial(ml) : volumeToMetric(ml);
}

export interface Temperature {
  readonly degrees: number;
  readonly scale: 'celsius' | 'fahrenheit';
}

/**
 * Only the structured `temperatureCelsius` column ever reaches this. A temperature
 * written into a step's text is prose the author wrote, and is never rewritten.
 */
export function convertTemperature(celsius: number, system: UnitSystem): Temperature {
  if (system === 'metric') return { degrees: celsius, scale: 'celsius' };
  return { degrees: Math.round((celsius * 9) / 5 + 32), scale: 'fahrenheit' };
}

/** The author's unit, for a field labelled °F on an imperial device. Celsius is what is stored. */
export function fromCelsius(celsius: number, system: UnitSystem): number {
  return convertTemperature(celsius, system).degrees;
}

/**
 * What an author typed in their own unit, as the Celsius the table stores. Rounded to a
 * whole degree, which is why 350 °F reads back as 351: 0008 accepted the drift.
 */
export function toCelsius(degrees: number, system: UnitSystem): number {
  if (system === 'metric') return Math.round(degrees);
  return Math.round(((degrees - 32) * 5) / 9);
}

export { COUNT_UNITS };
