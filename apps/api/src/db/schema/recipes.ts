import { relations } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { timestamps } from './columns.js';
import { recipeStatus, unit } from './enums.js';
import { users } from './users.js';

export const recipes = pgTable(
  'recipes',
  {
    id: uuid().primaryKey().defaultRandom(),
    authorId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Provenance only: where a copy came from. Grants no access to anything. */
    sourceRecipeId: uuid().references((): AnyPgColumn => recipes.id, { onDelete: 'set null' }),
    title: varchar({ length: 120 }).notNull(),
    description: text(),
    status: recipeStatus().notNull().default('draft'),
    /**
     * Marks a recipe shown in the Featured tab. Set directly in the database, never by
     * the app: nothing a user writes is ever publicly listed, which is what removes the
     * need for moderation rather than managing it.
     */
    featured: boolean().notNull().default(false),
    servings: integer().notNull(),
    /** Author-entered until 0008, then the sum of the main steps and no longer editable. */
    totalTimeMinutes: integer(),
    coverImageKey: varchar({ length: 255 }),
    /** Null means not shared. Revoking nulls it, so a revoked link is gone for good. */
    shareToken: varchar({ length: 12 }).unique(),
    ...timestamps,
  },
  (t) => [
    index('recipes_author_updated_idx').on(t.authorId, t.updatedAt),
    index('recipes_source_idx').on(t.sourceRecipeId),
    index('recipes_featured_idx').on(t.featured),
  ],
);

export const ingredients = pgTable(
  'ingredients',
  {
    id: uuid().primaryKey().defaultRandom(),
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer().notNull(),
    name: varchar({ length: 120 }).notNull(),
    /** The qualifier that does not belong in the name: "not too long", "plain not self-raising". */
    note: text(),
    /** Null amount is an unmeasured quantity, as in "salt, to taste". */
    amount: numeric({ precision: 10, scale: 2 }),
    unit: unit(),
    ...timestamps,
  },
  (t) => [uniqueIndex('ingredients_recipe_position_key').on(t.recipeId, t.position)],
);

export const equipment = pgTable(
  'equipment',
  {
    id: uuid().primaryKey().defaultRandom(),
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer().notNull(),
    name: varchar({ length: 120 }).notNull(),
    note: text(),
    optional: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('equipment_recipe_position_key').on(t.recipeId, t.position)],
);

export const steps = pgTable(
  'steps',
  {
    id: uuid().primaryKey().defaultRandom(),
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    /**
     * The step this one happens *during*. Null is a main step. One level only, and a
     * parent must belong to the same recipe: neither is expressible as a constraint,
     * so both are enforced in application code from 0008.
     */
    parentStepId: uuid().references((): AnyPgColumn => steps.id, { onDelete: 'cascade' }),
    position: integer().notNull(),
    body: text().notNull(),
    /** Extra worth knowing while doing it, as opposed to the instruction itself. */
    note: text(),
    durationSeconds: integer(),
    temperatureCelsius: integer(),
    /** What it should look like when done. Shown behind a button, never inline. */
    imageKey: varchar({ length: 255 }),
    ...timestamps,
  },
  (t) => [index('steps_recipe_parent_position_idx').on(t.recipeId, t.parentStepId, t.position)],
);

export const stepIngredients = pgTable(
  'step_ingredients',
  {
    stepId: uuid()
      .notNull()
      .references(() => steps.id, { onDelete: 'cascade' }),
    ingredientId: uuid()
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.stepId, t.ingredientId] })],
);

export const stepEquipment = pgTable(
  'step_equipment',
  {
    stepId: uuid()
      .notNull()
      .references(() => steps.id, { onDelete: 'cascade' }),
    equipmentId: uuid()
      .notNull()
      .references(() => equipment.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.stepId, t.equipmentId] })],
);

export const cooks = pgTable(
  'cooks',
  {
    id: uuid().primaryKey().defaultRandom(),
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    startedAt: timestamp({ withTimezone: true }).notNull(),
    /** Null is a cook that was abandoned, which is worth knowing rather than hiding. */
    finishedAt: timestamp({ withTimezone: true }),
    /**
     * Ingredient *names*, not ids: history records what happened and must not change or
     * break when the recipe is edited later.
     */
    excluded: jsonb().$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (t) => [index('cooks_recipe_started_idx').on(t.recipeId, t.startedAt)],
);

export const cookNotes = pgTable(
  'cook_notes',
  {
    id: uuid().primaryKey().defaultRandom(),
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    /** Null is a note on the whole recipe rather than on one step. */
    stepId: uuid().references(() => steps.id, { onDelete: 'cascade' }),
    /** Set when written during or just after a cook; null when added later. */
    cookId: uuid().references(() => cooks.id, { onDelete: 'set null' }),
    body: text().notNull(),
    ...timestamps,
  },
  (t) => [index('cook_notes_recipe_created_idx').on(t.recipeId, t.createdAt)],
);

export const stepsRelations = relations(steps, ({ one, many }) => ({
  parent: one(steps, { fields: [steps.parentStepId], references: [steps.id] }),
  children: many(steps),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  author: one(users, { fields: [recipes.authorId], references: [users.id] }),
  ingredients: many(ingredients),
  equipment: many(equipment),
  steps: many(steps),
}));
