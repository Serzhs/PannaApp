import { z } from 'zod';

import { unitSchema } from './units.js';

/**
 * 0016. The document a user's own AI writes from the prompt the app hands out. Steps
 * nest by containment, so there is no id to check; links name lines by their `name`.
 * The version travels with every document, because the prompt will change and older
 * output will still be pasted in.
 */
export const IMPORT_SCHEMA_VERSION = 1;

const name = z.string().trim().min(1).max(120);
const text = z.string().trim();

export const importIngredientSchema = z.object({
  name,
  amount: z.number().positive().max(99999.99).nullish(),
  unit: unitSchema.nullish(),
  note: text.max(500).nullish(),
});

export const importEquipmentSchema = z.object({
  name,
  note: text.max(500).nullish(),
  optional: z.boolean().nullish(),
});

const stepFields = {
  body: text.min(1).max(2000),
  note: text.max(500).nullish(),
  minutes: z.number().min(0).max(1440).nullish(),
  ingredients: z.array(name).nullish(),
  equipment: z.array(name).nullish(),
};

export const importNestedStepSchema = z.object(stepFields);
export const importStepSchema = z.object({
  ...stepFields,
  meanwhile: z.array(importNestedStepSchema).nullish(),
});

export const importDocumentSchema = z.object({
  schemaVersion: z.literal(IMPORT_SCHEMA_VERSION),
  title: z.string().trim().min(1).max(120),
  description: text.max(2000).nullish(),
  servings: z.number().int().min(1).max(100).nullish(),
  ingredients: z.array(importIngredientSchema).nullish(),
  equipment: z.array(importEquipmentSchema).nullish(),
  steps: z.array(importStepSchema).nullish(),
});

export type ImportDocument = z.infer<typeof importDocumentSchema>;
export type ImportStep = z.infer<typeof importStepSchema>;
export type ImportNestedStep = z.infer<typeof importNestedStepSchema>;
