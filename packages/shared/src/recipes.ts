import { z } from 'zod';

import { unitSchema } from './units.js';

export const recipeStatusSchema = z.enum(['draft', 'ready']);
export type RecipeStatus = z.infer<typeof recipeStatusSchema>;

/** Field rules shared by create and update, per 0005. */
const title = z.string().trim().min(1).max(120);
const description = z.string().trim().max(2000);
const servings = z.number().int().min(1).max(100);
const totalTimeMinutes = z.number().int().min(1).max(1440);

/**
 * What every recipe endpoint answers with. `authorId`, `coverImageKey` and
 * `shareToken` are deliberately absent: the caller already is the author, images are
 * 0010, and sharing state becomes visible in 0016.
 */
export const recipeSchema = z.object({
  id: z.string().uuid(),
  title,
  description: description.nullable(),
  status: recipeStatusSchema,
  servings,
  totalTimeMinutes: totalTimeMinutes.nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const recipeListSchema = z.array(recipeSchema);

/** 0007. Field rules for what a recipe needs, shared by the API and the editor. */
const lineName = z.string().trim().min(1).max(120);
const lineNote = z.string().trim().max(200);
/** Two decimal places at most: the column is numeric(10,2), and nobody weighs finer. */
const amount = z
  .number()
  .gt(0)
  .max(99999.99)
  .refine((value) => Number.isInteger(value * 100), { message: 'At most two decimals' });

export const MAX_INGREDIENTS = 100;
export const MAX_EQUIPMENT = 50;
/** 0008. A recipe holds at most this many main steps, and a main step this many nested ones. */
export const MAX_MAIN_STEPS = 60;
export const MAX_NESTED_STEPS = 20;

export const ingredientSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
  name: lineName,
  note: lineNote.nullable(),
  amount: amount.nullable(),
  unit: unitSchema.nullable(),
});

export const equipmentSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
  name: lineName,
  note: lineNote.nullable(),
  optional: z.boolean(),
});

/** A row in a write: an id says update this one, none says insert. Position is the index. */
export const ingredientInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: lineName,
    note: lineNote.nullable().optional(),
    amount: amount.nullable().optional(),
    unit: unitSchema.nullable().optional(),
  })
  .strict()
  .refine((line) => !(line.unit != null && line.amount == null), {
    message: 'A unit needs an amount',
    path: ['unit'],
  });

export const equipmentInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: lineName,
    note: lineNote.nullable().optional(),
    optional: z.boolean().optional(),
  })
  .strict();

/** 0008. Field rules for a step. The instruction stays short; the note carries the rest. */
const stepBody = z.string().trim().min(1).max(2000);
const stepNote = z.string().trim().max(500);
const durationSeconds = z.number().int().min(1).max(86400);
/** Stored in Celsius whatever the author typed; -50 covers a freezer, 500 a pizza oven. */
const temperatureCelsius = z.number().int().min(-50).max(500);

const stepFields = {
  id: z.string().uuid(),
  position: z.number().int().min(0),
  body: stepBody,
  note: stepNote.nullable(),
  durationSeconds: durationSeconds.nullable(),
  temperatureCelsius: temperatureCelsius.nullable(),
};

/** A nested step: the same fields, and nothing under it. One level, by shape. */
export const nestedStepSchema = z.object(stepFields);
export const stepSchema = z.object({ ...stepFields, children: z.array(nestedStepSchema) });

const stepInputFields = {
  id: z.string().uuid().optional(),
  body: stepBody,
  note: stepNote.nullable().optional(),
  durationSeconds: durationSeconds.nullable().optional(),
  temperatureCelsius: temperatureCelsius.nullable().optional(),
};

/** Strict, so a nested step carrying `children` is refused rather than silently flattened. */
export const nestedStepInputSchema = z.object(stepInputFields).strict();
export const stepInputSchema = z
  .object({
    ...stepInputFields,
    children: z.array(nestedStepInputSchema).max(MAX_NESTED_STEPS).optional(),
  })
  .strict();

/** A recipe with what it needs and what to do. The list endpoint carries the summary only. */
export const recipeDetailSchema = recipeSchema.extend({
  ingredients: z.array(ingredientSchema),
  equipment: z.array(equipmentSchema),
  steps: z.array(stepSchema),
});

/** Strict: `status` is not accepted here, because every new recipe starts as a draft. */
/**
 * Strict: `status` is not accepted here, because every new recipe starts as a draft, and
 * neither is `totalTimeMinutes`, which 0008 derives from the steps.
 */
export const createRecipeBodySchema = z
  .object({
    title,
    description: description.optional(),
    servings,
  })
  .strict();

/**
 * Any subset, but never nothing. Null clears a field, and only the two fields that
 * can be null in the table accept it.
 */
export const updateRecipeBodySchema = z
  .object({
    title,
    description: description.nullable(),
    status: recipeStatusSchema,
    servings,
    ingredients: z.array(ingredientInputSchema).max(MAX_INGREDIENTS),
    equipment: z.array(equipmentInputSchema).max(MAX_EQUIPMENT),
    steps: z.array(stepInputSchema).max(MAX_MAIN_STEPS),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' });

export type Recipe = z.infer<typeof recipeSchema>;
export type RecipeDetail = z.infer<typeof recipeDetailSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
export type IngredientInput = z.infer<typeof ingredientInputSchema>;
export type EquipmentInput = z.infer<typeof equipmentInputSchema>;
export type Step = z.infer<typeof stepSchema>;
export type NestedStep = z.infer<typeof nestedStepSchema>;
export type StepInput = z.infer<typeof stepInputSchema>;
export type NestedStepInput = z.infer<typeof nestedStepInputSchema>;
export type CreateRecipeBody = z.infer<typeof createRecipeBodySchema>;
export type UpdateRecipeBody = z.infer<typeof updateRecipeBodySchema>;
