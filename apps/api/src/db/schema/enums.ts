import { pgEnum } from 'drizzle-orm/pg-core';

export const authProvider = pgEnum('auth_provider', ['google', 'apple']);

export const unitSystem = pgEnum('unit_system', ['metric', 'imperial']);

export const recipeStatus = pgEnum('recipe_status', ['draft', 'ready']);

/**
 * Grouped by dimension, because conversion only ever happens within one. Volume is
 * never converted to mass: that needs the density of the specific ingredient, and
 * guessing produces confidently wrong recipes.
 */
export const unit = pgEnum('unit', [
  // mass
  'g',
  'kg',
  'oz',
  'lb',
  // volume
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'floz',
  // count
  'piece',
  'pinch',
  'clove',
  'slice',
]);
