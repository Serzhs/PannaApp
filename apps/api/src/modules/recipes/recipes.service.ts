import { Injectable } from '@nestjs/common';
import type { CreateRecipeBody, Recipe, UpdateRecipeBody } from '@panna/shared';
import { and, desc, eq } from 'drizzle-orm';

import { DatabaseService } from '../../db/database.service.js';
import { recipes } from '../../db/schema/index.js';

export type RecipeRow = typeof recipes.$inferSelect;

/**
 * The response shape is narrower than the row: no author, no image key, no share
 * token. Mapping here, once, is what keeps a column added later from leaking out.
 */
export function toRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    servings: row.servings,
    totalTimeMinutes: row.totalTimeMinutes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class RecipesService {
  constructor(private readonly database: DatabaseService) {}

  /** Most recently worked on first; the id breaks ties so the order is stable. */
  async list(authorId: string): Promise<Recipe[]> {
    const rows = await this.database.db
      .select()
      .from(recipes)
      .where(eq(recipes.authorId, authorId))
      .orderBy(desc(recipes.updatedAt), desc(recipes.id));
    return rows.map(toRecipe);
  }

  async findOwned(id: string, authorId: string): Promise<RecipeRow | undefined> {
    const [row] = await this.database.db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.authorId, authorId)))
      .limit(1);
    return row;
  }

  async create(authorId: string, body: CreateRecipeBody): Promise<Recipe> {
    const [row] = await this.database.db
      .insert(recipes)
      .values({
        authorId,
        title: body.title,
        description: body.description ?? null,
        servings: body.servings,
        totalTimeMinutes: body.totalTimeMinutes ?? null,
      })
      .returning();
    if (row === undefined) throw new Error('insert returned nothing');
    return toRecipe(row);
  }

  async update(id: string, body: UpdateRecipeBody): Promise<Recipe | undefined> {
    const [row] = await this.database.db
      .update(recipes)
      // The database does not refresh updatedAt on its own, and the list is ordered by it.
      .set({ ...body, updatedAt: new Date() })
      .where(eq(recipes.id, id))
      .returning();
    return row === undefined ? undefined : toRecipe(row);
  }

  async remove(id: string): Promise<boolean> {
    const deleted = await this.database.db
      .delete(recipes)
      .where(eq(recipes.id, id))
      .returning({ id: recipes.id });
    return deleted.length > 0;
  }
}
