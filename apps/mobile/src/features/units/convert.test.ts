import { unitSchema, type Unit } from '@panna/shared';

import { convertAmount, convertTemperature, dimensionOf, fromCelsius, toCelsius } from './convert';
import { formatAmount, formatTemperature } from './format';

import { i18n } from '@/i18n';

const t = i18n.t.bind(i18n);

describe('convertAmount', () => {
  /** The criterion: 500 g reads in pounds or ounces, 500 ml in cups or fluid ounces. */
  it('shows an imperial reader mass in pounds or ounces and volume in cups or fluid ounces', () => {
    expect(convertAmount(500, 'g', 'imperial')).toEqual({
      amount: 1.1,
      unit: 'lb',
      approximate: true,
    });
    expect(convertAmount(100, 'g', 'imperial')).toEqual({
      amount: 3.5,
      unit: 'oz',
      approximate: true,
    });
    expect(convertAmount(500, 'ml', 'imperial')).toEqual({
      amount: 2,
      unit: 'cup',
      approximate: true,
    });
    expect(convertAmount(100, 'ml', 'imperial')).toEqual({
      amount: 3.4,
      unit: 'floz',
      approximate: true,
    });
  });

  it('rounds volumes to a common fraction, or falls back to fluid ounces', () => {
    expect(convertAmount(250, 'ml', 'imperial')).toEqual({
      amount: 1,
      unit: 'cup',
      approximate: true,
    });
    expect(convertAmount(60, 'ml', 'imperial')).toEqual({
      amount: 0.25,
      unit: 'cup',
      approximate: true,
    });
    expect(convertAmount(175, 'ml', 'imperial')).toEqual({
      amount: 0.75,
      unit: 'cup',
      approximate: true,
    });
    expect(convertAmount(5, 'ml', 'imperial')).toEqual({
      amount: 1,
      unit: 'tsp',
      approximate: true,
    });
    expect(convertAmount(15, 'ml', 'imperial')).toEqual({
      amount: 1,
      unit: 'tbsp',
      approximate: true,
    });
  });

  it('shows a metric reader imperial amounts in grams or millilitres, to a sensible step', () => {
    expect(convertAmount(1, 'lb', 'metric')).toEqual({ amount: 455, unit: 'g', approximate: true });
    expect(convertAmount(1, 'cup', 'metric')).toEqual({
      amount: 235,
      unit: 'ml',
      approximate: true,
    });
    expect(convertAmount(2, 'tsp', 'metric')).toEqual({
      amount: 10,
      unit: 'ml',
      approximate: true,
    });
    expect(convertAmount(5, 'lb', 'metric')).toEqual({
      amount: 2.27,
      unit: 'kg',
      approximate: true,
    });
  });

  it("leaves an amount alone when it is already in the reader's system", () => {
    expect(convertAmount(500, 'g', 'metric')).toEqual({
      amount: 500,
      unit: 'g',
      approximate: false,
    });
    expect(convertAmount(2, 'cup', 'imperial')).toEqual({
      amount: 2,
      unit: 'cup',
      approximate: false,
    });
  });

  it('never converts a count', () => {
    expect(convertAmount(3, 'clove', 'imperial')).toEqual({
      amount: 3,
      unit: 'clove',
      approximate: false,
    });
    expect(convertAmount(1, 'pinch', 'metric')).toEqual({
      amount: 1,
      unit: 'pinch',
      approximate: false,
    });
  });

  /** The criterion: over every unit and both systems, the dimension never changes. */
  it.each(
    unitSchema.options.flatMap((unit) => [[unit, 'metric'] as const, [unit, 'imperial'] as const]),
  )('keeps %s in its own dimension for a %s reader', (unit: Unit, system) => {
    for (const amount of [0.5, 1, 7, 250, 1500]) {
      const converted = convertAmount(amount, unit, system);
      expect(dimensionOf(converted.unit)).toBe(dimensionOf(unit));
      expect(converted.amount).toBeGreaterThan(0);
    }
  });
});

describe('convertTemperature', () => {
  /** The criterion: 180 shows as 356°F. Only the structured column reaches this. */
  it('turns 180°C into 356°F for an imperial reader, and leaves it for a metric one', () => {
    expect(convertTemperature(180, 'imperial')).toEqual({ degrees: 356, scale: 'fahrenheit' });
    expect(convertTemperature(180, 'metric')).toEqual({ degrees: 180, scale: 'celsius' });
  });
});

describe('typing a temperature in your own unit', () => {
  /** 0008 accepted a degree of drift: 350 becomes 177 becomes 351. */
  it('stores what an imperial author typed as Celsius, and reads it back a degree off at most', () => {
    expect(toCelsius(350, 'imperial')).toBe(177);
    expect(fromCelsius(177, 'imperial')).toBe(351);
    expect(toCelsius(180, 'metric')).toBe(180);
    expect(fromCelsius(180, 'metric')).toBe(180);
  });
});

describe('formatting', () => {
  it('reads as something a person would say, marked approximate when converted', () => {
    expect(formatAmount(250, 'ml', 'imperial', t, 'en')).toBe('about 1 cup');
    expect(formatAmount(60, 'ml', 'imperial', t, 'en')).toBe('about ¼ cup');
    expect(formatAmount(500, 'ml', 'imperial', t, 'en')).toBe('about 2 cups');
    expect(formatAmount(500, 'g', 'metric', t, 'en')).toBe('500 g');
    expect(formatAmount(2, 'clove', 'imperial', t, 'en')).toBe('2 cloves');
    expect(formatTemperature(180, 'imperial', t)).toBe('356°F');
    expect(formatTemperature(180, 'metric', t)).toBe('180°C');
  });
});
