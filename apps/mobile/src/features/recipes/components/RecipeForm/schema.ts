import { createRecipeBodySchema, type CreateRecipeBody } from '@panna/shared';
import { z } from 'zod';

/** What the inputs hold: text, always, because that is what a text field gives back. */
export interface RecipeFormValues {
  readonly title: string;
  readonly description: string;
  readonly servings: string;
}

export const EMPTY_VALUES: RecipeFormValues = {
  title: '',
  description: '',
  servings: '',
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
  })
  // Total time is not here: 0008 derives it from the steps.
  .transform((values) => ({
    title: values.title,
    ...(values.description.trim() === '' ? {} : { description: values.description }),
    servings: asNumber(values.servings) ?? Number.NaN,
  }))
  .pipe(createRecipeBodySchema);

export type RecipeFormOutput = CreateRecipeBody;

/** One message per field, whatever the rule broken: the fix is the same either way. */
export const FIELD_MESSAGE_KEYS: Record<keyof RecipeFormValues, string> = {
  title: 'recipes:form.errors.title',
  description: 'recipes:form.errors.description',
  servings: 'recipes:form.errors.servings',
};
