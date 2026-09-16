import { z } from 'zod';

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

/** Strict: `status` is not accepted here, because every new recipe starts as a draft. */
export const createRecipeBodySchema = z
  .object({
    title,
    description: description.optional(),
    servings,
    totalTimeMinutes: totalTimeMinutes.optional(),
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
    totalTimeMinutes: totalTimeMinutes.nullable(),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' });

export type Recipe = z.infer<typeof recipeSchema>;
export type CreateRecipeBody = z.infer<typeof createRecipeBodySchema>;
export type UpdateRecipeBody = z.infer<typeof updateRecipeBodySchema>;
