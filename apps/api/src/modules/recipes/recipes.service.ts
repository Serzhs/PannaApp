import { Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  type CreateRecipeBody,
  type Equipment,
  type EquipmentInput,
  type Ingredient,
  type IngredientInput,
  type Recipe,
  type RecipeDetail,
  type UpdateRecipeBody,
} from '@panna/shared';
import { and, asc, desc, eq, notInArray } from 'drizzle-orm';

import { AppException } from '../../common/app-exception.js';
import type { Database } from '../../db/client.js';
import { DatabaseService } from '../../db/database.service.js';
import { equipment, ingredients, recipes } from '../../db/schema/index.js';

export type RecipeRow = typeof recipes.$inferSelect;
type IngredientRow = typeof ingredients.$inferSelect;
type EquipmentRow = typeof equipment.$inferSelect;
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

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

/** numeric columns come back as strings, and the contract promises a number. */
function toIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    position: row.position,
    name: row.name,
    note: row.note,
    amount: row.amount === null ? null : Number(row.amount),
    unit: row.unit,
  };
}

function toEquipment(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    position: row.position,
    name: row.name,
    note: row.note,
    optional: row.optional,
  };
}

/**
 * Rows are kept far apart from their final positions while the list is rewritten,
 * because (recipeId, position) is unique and swapping two rows in place would collide.
 */
const PARKED = -1000;

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

  async detail(row: RecipeRow): Promise<RecipeDetail> {
    return this.readDetail(this.database.db, row);
  }

  private async readDetail(db: Database | Tx, row: RecipeRow): Promise<RecipeDetail> {
    const [ingredientRows, equipmentRows] = await Promise.all([
      db
        .select()
        .from(ingredients)
        .where(eq(ingredients.recipeId, row.id))
        .orderBy(asc(ingredients.position)),
      db
        .select()
        .from(equipment)
        .where(eq(equipment.recipeId, row.id))
        .orderBy(asc(equipment.position)),
    ]);
    return {
      ...toRecipe(row),
      ingredients: ingredientRows.map(toIngredient),
      equipment: equipmentRows.map(toEquipment),
    };
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

  /**
   * One transaction for the metadata and both lists, per the API conventions in
   * CLAUDE.md: a bad fourth ingredient leaves the first three unwritten as well.
   */
  async update(id: string, body: UpdateRecipeBody): Promise<RecipeDetail | undefined> {
    const { ingredients: ingredientLines, equipment: equipmentLines, ...meta } = body;
    return this.database.db.transaction(async (tx) => {
      const [row] = await tx
        .update(recipes)
        // The database does not refresh updatedAt on its own, and the list is ordered by it.
        .set({ ...meta, updatedAt: new Date() })
        .where(eq(recipes.id, id))
        .returning();
      if (row === undefined) return undefined;

      if (ingredientLines !== undefined) await this.writeIngredients(tx, id, ingredientLines);
      if (equipmentLines !== undefined) await this.writeEquipment(tx, id, equipmentLines);
      return this.readDetail(tx, row);
    });
  }

  /**
   * An id that is not one of this recipe's rows is refused rather than ignored: it is
   * either a stale editor or an attempt to reach into someone else's recipe, and both
   * deserve an error naming the line.
   */
  private static checkIds(
    field: string,
    lines: readonly { id?: string | undefined }[],
    existing: ReadonlySet<string>,
  ): void {
    const seen = new Set<string>();
    const fields: Record<string, string> = {};
    lines.forEach((line, index) => {
      if (line.id === undefined) return;
      if (seen.has(line.id)) fields[`${field}.${String(index)}.id`] = 'DUPLICATE_ID';
      else if (!existing.has(line.id)) fields[`${field}.${String(index)}.id`] = 'UNKNOWN_ID';
      seen.add(line.id);
    });
    if (Object.keys(fields).length > 0) {
      throw new AppException(
        400,
        ERROR_CODES.VALIDATION_FAILED,
        'A line names a row this recipe does not have',
        fields,
      );
    }
  }

  private async writeIngredients(
    tx: Tx,
    recipeId: string,
    lines: readonly IngredientInput[],
  ): Promise<void> {
    const existing = new Set(
      (
        await tx
          .select({ id: ingredients.id })
          .from(ingredients)
          .where(eq(ingredients.recipeId, recipeId))
      ).map((r) => r.id),
    );
    RecipesService.checkIds('ingredients', lines, existing);
    const kept = lines.flatMap((line) => (line.id === undefined ? [] : [line.id]));

    await tx
      .delete(ingredients)
      .where(
        kept.length > 0
          ? and(eq(ingredients.recipeId, recipeId), notInArray(ingredients.id, kept))
          : eq(ingredients.recipeId, recipeId),
      );
    if (kept.length > 0) {
      // Parking every kept row at one value would itself collide, so each gets its own.
      for (const [index, keptId] of kept.entries()) {
        await tx
          .update(ingredients)
          .set({ position: PARKED - index })
          .where(eq(ingredients.id, keptId));
      }
    }

    for (const [position, line] of lines.entries()) {
      const values = {
        position,
        name: line.name,
        note: line.note ?? null,
        amount: line.amount == null ? null : line.amount.toFixed(2),
        unit: line.unit ?? null,
        updatedAt: new Date(),
      };
      if (line.id === undefined) await tx.insert(ingredients).values({ recipeId, ...values });
      else await tx.update(ingredients).set(values).where(eq(ingredients.id, line.id));
    }
  }

  private async writeEquipment(
    tx: Tx,
    recipeId: string,
    lines: readonly EquipmentInput[],
  ): Promise<void> {
    const existing = new Set(
      (
        await tx
          .select({ id: equipment.id })
          .from(equipment)
          .where(eq(equipment.recipeId, recipeId))
      ).map((r) => r.id),
    );
    RecipesService.checkIds('equipment', lines, existing);
    const kept = lines.flatMap((line) => (line.id === undefined ? [] : [line.id]));

    await tx
      .delete(equipment)
      .where(
        kept.length > 0
          ? and(eq(equipment.recipeId, recipeId), notInArray(equipment.id, kept))
          : eq(equipment.recipeId, recipeId),
      );
    for (const [index, keptId] of kept.entries()) {
      await tx
        .update(equipment)
        .set({ position: PARKED - index })
        .where(eq(equipment.id, keptId));
    }

    for (const [position, line] of lines.entries()) {
      const values = {
        position,
        name: line.name,
        note: line.note ?? null,
        optional: line.optional ?? false,
        updatedAt: new Date(),
      };
      if (line.id === undefined) await tx.insert(equipment).values({ recipeId, ...values });
      else await tx.update(equipment).set(values).where(eq(equipment.id, line.id));
    }
  }

  async remove(id: string): Promise<boolean> {
    const deleted = await this.database.db
      .delete(recipes)
      .where(eq(recipes.id, id))
      .returning({ id: recipes.id });
    return deleted.length > 0;
  }
}
