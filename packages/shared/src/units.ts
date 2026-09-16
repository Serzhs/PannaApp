import { z } from 'zod';

/**
 * Grouped by dimension, because conversion only ever happens within one. Volume is
 * never converted to mass: that needs the density of the specific ingredient.
 */
export const MASS_UNITS = ['g', 'kg', 'oz', 'lb'] as const;
export const VOLUME_UNITS = ['ml', 'l', 'tsp', 'tbsp', 'cup', 'floz'] as const;
export const COUNT_UNITS = ['piece', 'pinch', 'clove', 'slice'] as const;

export const unitSchema = z.enum([...MASS_UNITS, ...VOLUME_UNITS, ...COUNT_UNITS]);
export type Unit = z.infer<typeof unitSchema>;

export const unitSystemSchema = z.enum(['metric', 'imperial']);
export type UnitSystem = z.infer<typeof unitSystemSchema>;
