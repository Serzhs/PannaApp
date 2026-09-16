import { createRecipeBodySchema, type CreateRecipeBody } from '@panna/shared';
import { z } from 'zod';

/** What the inputs hold: text, always, because that is what a text field gives back. */
export interface RecipeFormValues {
  readonly title: string;
  readonly description: string;
  readonly servings: string;
  readonly totalTimeMinutes: string;
}

export const EMPTY_VALUES: RecipeFormValues = {
  title: '',
  description: '',
  servings: '',
  totalTimeMinutes: '',
};

function asNumber(text: string): number | undefined {
  const trimmed = text.trim();
  return trimmed === '' ? undefined : Number(trimmed);
}

/**
 * The form is validated by the body schema the API validates with, per the Mobile
 * conventions in CLAUDE.md: the text is reshaped into a body, then piped through the
 * shared schema, so an issue lands on the field it came from.
 */
export const recipeFormSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    servings: z.string(),
    totalTimeMinutes: z.string(),
  })
  .transform((values) => ({
    title: values.title,
    ...(values.description.trim() === '' ? {} : { description: values.description }),
    servings: asNumber(values.servings) ?? Number.NaN,
    ...(asNumber(values.totalTimeMinutes) === undefined
      ? {}
      : { totalTimeMinutes: asNumber(values.totalTimeMinutes) }),
  }))
  .pipe(createRecipeBodySchema);

export type RecipeFormOutput = CreateRecipeBody;

/** Short and in plain words, one per field. Whatever the rule broken, the fix is the same. */
export const FIELD_MESSAGES: Record<keyof RecipeFormValues, string> = {
  title: 'Give it a title, up to 120 characters.',
  description: 'Keep the description under 2000 characters.',
  servings: 'Servings is a whole number from 1 to 100.',
  totalTimeMinutes: 'Time is a whole number of minutes, up to 1440.',
};
