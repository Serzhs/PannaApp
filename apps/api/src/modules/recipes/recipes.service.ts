import { Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  type AddNoteBody,
  type Cook,
  type CookNote,
  type CreateRecipeBody,
  type Equipment,
  type EquipmentInput,
  type Ingredient,
  type IngredientInput,
  type NestedStep,
  type Recipe,
  type RecipeDetail,
  type RecordCookBody,
  type Step,
  type StepInput,
  type UpdateRecipeBody,
} from '@panna/shared';
import { and, asc, count, desc, eq, inArray, max, notInArray } from 'drizzle-orm';

import { AppException } from '../../common/app-exception.js';
import type { Database } from '../../db/client.js';
import { DatabaseService } from '../../db/database.service.js';
import {
  cookNotes,
  cooks,
  equipment,
  ingredients,
  recipes,
  stepEquipment,
  stepIngredients,
  steps,
} from '../../db/schema/index.js';
import { ImagesService } from '../images/images.service.js';

export type RecipeRow = typeof recipes.$inferSelect;
type IngredientRow = typeof ingredients.$inferSelect;
type EquipmentRow = typeof equipment.$inferSelect;
type StepRow = typeof steps.$inferSelect;
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];
type StepLine = StepInput | NonNullable<StepInput['children']>[number];
/** Per step id, the linked ids already in the order of the recipe's lists (0010). */
type StepLinks = Readonly<Record<'ingredientIds' | 'equipmentIds', ReadonlyMap<string, string[]>>>;

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
    coverImageKey: row.coverImageKey,
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

type CookRow = typeof cooks.$inferSelect;
type NoteRow = typeof cookNotes.$inferSelect;

function toNote(row: NoteRow): CookNote {
  return {
    id: row.id,
    stepId: row.stepId,
    cookId: row.cookId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

function toCook(row: CookRow): Cook {
  return {
    id: row.id,
    recipeId: row.recipeId,
    startedAt: row.startedAt.toISOString(),
    // Nothing here writes a null finish; a row that has one was not made by this API.
    finishedAt: (row.finishedAt ?? row.startedAt).toISOString(),
    excluded: row.excluded,
  };
}

function toNestedStep(row: StepRow, links: StepLinks): NestedStep {
  return {
    id: row.id,
    position: row.position,
    body: row.body,
    note: row.note,
    durationSeconds: row.durationSeconds,
    ingredientIds: links.ingredientIds.get(row.id) ?? [],
    equipmentIds: links.equipmentIds.get(row.id) ?? [],
    imageKey: row.imageKey,
  };
}

/** Main steps in order, each with its children in order. One level, as the table is used. */
function toSteps(rows: readonly StepRow[], links: StepLinks): Step[] {
  const byPosition = (a: StepRow, b: StepRow) => a.position - b.position;
  return rows
    .filter((row) => row.parentStepId === null)
    .sort(byPosition)
    .map((main) => ({
      ...toNestedStep(main, links),
      children: rows
        .filter((row) => row.parentStepId === main.id)
        .sort(byPosition)
        .map((child) => toNestedStep(child, links)),
    }));
}

/**
 * Link rows carry no position of their own: a step's ingredients read in the order the
 * ingredient list has them, so the two never disagree on screen.
 */
function groupLinks(
  rows: readonly { stepId: string; targetId: string }[],
  ordered: readonly { id: string }[],
): Map<string, string[]> {
  const rank = new Map(ordered.map((row, index) => [row.id, index]));
  const grouped = new Map<string, string[]>();
  for (const { stepId, targetId } of rows) {
    grouped.set(stepId, [...(grouped.get(stepId) ?? []), targetId]);
  }
  for (const ids of grouped.values()) {
    ids.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
  }
  return grouped;
}

/**
 * The sum of the main steps' durations, rounded up to a minute; nested steps happen
 * inside their parent's time and add nothing. Null when nothing is timed.
 */
export function totalMinutes(rows: readonly StepRow[]): number | null {
  const seconds = rows
    .filter((row) => row.parentStepId === null && row.durationSeconds !== null)
    .reduce((sum, row) => sum + (row.durationSeconds ?? 0), 0);
  return seconds === 0 ? null : Math.ceil(seconds / 60);
}

/**
 * Rows are kept far apart from their final positions while the list is rewritten,
 * because (recipeId, position) is unique and swapping two rows in place would collide.
 */
const PARKED = -1000;

@Injectable()
export class RecipesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly images: ImagesService,
  ) {}

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
    const [
      ingredientRows,
      equipmentRows,
      stepRows,
      ingredientLinks,
      equipmentLinks,
      made,
      noteRows,
    ] = await Promise.all([
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
      db.select().from(steps).where(eq(steps.recipeId, row.id)),
      db
        .select({ stepId: stepIngredients.stepId, targetId: stepIngredients.ingredientId })
        .from(stepIngredients)
        .innerJoin(steps, eq(steps.id, stepIngredients.stepId))
        .where(eq(steps.recipeId, row.id)),
      db
        .select({ stepId: stepEquipment.stepId, targetId: stepEquipment.equipmentId })
        .from(stepEquipment)
        .innerJoin(steps, eq(steps.id, stepEquipment.stepId))
        .where(eq(steps.recipeId, row.id)),
      db
        .select({ count: count(), last: max(cooks.finishedAt) })
        .from(cooks)
        .where(eq(cooks.recipeId, row.id)),
      db
        .select()
        .from(cookNotes)
        .where(eq(cookNotes.recipeId, row.id))
        .orderBy(desc(cookNotes.createdAt)),
    ]);
    return {
      ...toRecipe(row),
      ingredients: ingredientRows.map(toIngredient),
      equipment: equipmentRows.map(toEquipment),
      steps: toSteps(stepRows, {
        ingredientIds: groupLinks(ingredientLinks, ingredientRows),
        equipmentIds: groupLinks(equipmentLinks, equipmentRows),
      }),
      cookCount: made[0]?.count ?? 0,
      lastCookedAt: made[0]?.last?.toISOString() ?? null,
      notes: noteRows.map(toNote),
    };
  }

  /** A note from the recipe screen or the guide (0015). The step, if any, must be this recipe's. */
  async addNote(recipeId: string, body: AddNoteBody): Promise<CookNote> {
    if (body.stepId !== undefined) {
      const [step] = await this.database.db
        .select({ id: steps.id })
        .from(steps)
        .where(and(eq(steps.id, body.stepId), eq(steps.recipeId, recipeId)));
      if (step === undefined) {
        throw new AppException(400, ERROR_CODES.VALIDATION_FAILED, 'Not a step of this recipe', {
          stepId: 'UNKNOWN_ID',
        });
      }
    }
    const [row] = await this.database.db
      .insert(cookNotes)
      .values({ recipeId, stepId: body.stepId ?? null, cookId: null, body: body.body })
      .returning();
    if (row === undefined) throw new Error('insert returned nothing');
    return toNote(row);
  }

  /**
   * The device sends a finished cook with an id it made, and may send it again if the
   * answer was lost (0014). The second arrival answers with the row the first one wrote.
   */
  async recordCook(
    recipeId: string,
    body: RecordCookBody,
  ): Promise<{ cook: Cook; created: boolean }> {
    const [existing] = await this.database.db.select().from(cooks).where(eq(cooks.id, body.id));
    if (existing !== undefined) {
      // An id that belongs to another recipe is a 404 here, not a leak of the other row.
      if (existing.recipeId !== recipeId) {
        throw new AppException(404, ERROR_CODES.RECIPE_NOT_FOUND, 'No such recipe');
      }
      return { cook: toCook(existing), created: false };
    }
    // The cook and its finish note land together or not at all, per the roadmap note for 0015.
    const row = await this.database.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(cooks)
        .values({
          id: body.id,
          recipeId,
          startedAt: new Date(body.startedAt),
          finishedAt: new Date(body.finishedAt),
          excluded: [...body.excluded],
        })
        .returning();
      if (inserted === undefined) throw new Error('insert returned nothing');
      if (body.note !== undefined && body.note !== '') {
        await tx
          .insert(cookNotes)
          .values({ recipeId, stepId: null, cookId: inserted.id, body: body.note });
      }
      return inserted;
    });
    return { cook: toCook(row), created: true };
  }

  async listCooks(recipeId: string): Promise<Cook[]> {
    const rows = await this.database.db
      .select()
      .from(cooks)
      .where(eq(cooks.recipeId, recipeId))
      .orderBy(desc(cooks.startedAt))
      .limit(50);
    return rows.map(toCook);
  }

  /** The recipe and whatever lists came with it, in one transaction (0025): a bad line creates nothing. */
  async create(authorId: string, body: CreateRecipeBody): Promise<RecipeDetail> {
    await this.checkImages({ coverImageKey: body.coverImageKey });
    return this.database.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(recipes)
        .values({
          authorId,
          title: body.title,
          description: body.description ?? null,
          servings: body.servings,
          coverImageKey: body.coverImageKey ?? null,
        })
        .returning();
      if (row === undefined) throw new Error('insert returned nothing');
      if (body.ingredients !== undefined) await this.writeIngredients(tx, row.id, body.ingredients);
      if (body.equipment !== undefined) await this.writeEquipment(tx, row.id, body.equipment);
      return this.readDetail(tx, row);
    });
  }

  /**
   * One transaction for the metadata and both lists, per the API conventions in
   * CLAUDE.md: a bad fourth ingredient leaves the first three unwritten as well.
   */
  async update(id: string, body: UpdateRecipeBody): Promise<RecipeDetail | undefined> {
    const {
      ingredients: ingredientLines,
      equipment: equipmentLines,
      steps: stepLines,
      ...meta
    } = body;
    await this.checkImages({ coverImageKey: meta.coverImageKey, steps: stepLines });
    // Files are deleted only once the rows that named them are gone for good (0011).
    const dropped: (string | null)[] = [];
    const detail = await this.database.db.transaction(async (tx) => {
      const [before] = await tx
        .select({ coverImageKey: recipes.coverImageKey })
        .from(recipes)
        .where(eq(recipes.id, id));
      const [row] = await tx
        .update(recipes)
        // The database does not refresh updatedAt on its own, and the list is ordered by it.
        .set({ ...meta, updatedAt: new Date() })
        .where(eq(recipes.id, id))
        .returning();
      if (row === undefined) return undefined;
      if (meta.coverImageKey !== undefined && before?.coverImageKey !== meta.coverImageKey) {
        dropped.push(before?.coverImageKey ?? null);
      }

      if (ingredientLines !== undefined) await this.writeIngredients(tx, id, ingredientLines);
      if (equipmentLines !== undefined) await this.writeEquipment(tx, id, equipmentLines);
      if (stepLines === undefined) return this.readDetail(tx, row);

      dropped.push(...(await this.writeSteps(tx, id, stepLines)));
      // Total time is derived from the main steps, per 0008, and stored so the list
      // can show it without a join.
      const stepRows = await tx.select().from(steps).where(eq(steps.recipeId, id));
      const [timed] = await tx
        .update(recipes)
        .set({ totalTimeMinutes: totalMinutes(stepRows) })
        .where(eq(recipes.id, id))
        .returning();
      return this.readDetail(tx, timed ?? row);
    });
    await this.images.remove(dropped);
    return detail;
  }

  /** A key with no file behind it is refused by path, like an id that is not this recipe's. */
  private async checkImages(body: {
    readonly coverImageKey?: string | null | undefined;
    readonly steps?: readonly StepInput[] | undefined;
  }): Promise<void> {
    const fields: Record<string, string> = {};
    const check = async (path: string, key: string | null | undefined) => {
      if (key != null && !(await this.images.exists(key))) fields[path] = 'UNKNOWN_IMAGE';
    };
    await check('coverImageKey', body.coverImageKey);
    for (const [i, main] of (body.steps ?? []).entries()) {
      await check(`steps.${String(i)}.imageKey`, main.imageKey);
      for (const [j, child] of (main.children ?? []).entries()) {
        await check(`steps.${String(i)}.children.${String(j)}.imageKey`, child.imageKey);
      }
    }
    if (Object.keys(fields).length > 0) {
      throw new AppException(
        400,
        ERROR_CODES.VALIDATION_FAILED,
        'A key names an image that does not exist',
        fields,
      );
    }
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

  /**
   * Same rules as the lists: an id is updated in place wherever it now sits, so a step
   * moved under another parent, or promoted to main, stays the same row. A row the body
   * no longer names is deleted; deleting a main step cascades to children the body did
   * not keep, and children the body lists elsewhere survive - which is the promotion
   * rule, expressed by the client listing them and the server never deleting a named row.
   */
  private async writeSteps(
    tx: Tx,
    recipeId: string,
    lines: readonly StepInput[],
  ): Promise<(string | null)[]> {
    const idsOf = async (rows: Promise<{ id: string }[]>) => new Set((await rows).map((r) => r.id));
    // The lists are written before the steps, so these are the ids a link may name after
    // this same body's deletions have happened (0010).
    const [existing, ingredientIds, equipmentIds] = await Promise.all([
      idsOf(tx.select({ id: steps.id }).from(steps).where(eq(steps.recipeId, recipeId))),
      idsOf(
        tx
          .select({ id: ingredients.id })
          .from(ingredients)
          .where(eq(ingredients.recipeId, recipeId)),
      ),
      idsOf(
        tx.select({ id: equipment.id }).from(equipment).where(eq(equipment.recipeId, recipeId)),
      ),
    ]);
    const seen = new Set<string>();
    const fields: Record<string, string> = {};
    const checkLinks = (path: string, ids: readonly string[] | undefined, known: Set<string>) => {
      if (ids === undefined) return;
      if (new Set(ids).size !== ids.length) fields[path] = 'DUPLICATE_ID';
      else if (ids.some((id) => !known.has(id))) fields[path] = 'UNKNOWN_ID';
    };
    const check = (path: string, line: StepLine) => {
      checkLinks(`${path}.ingredientIds`, line.ingredientIds, ingredientIds);
      checkLinks(`${path}.equipmentIds`, line.equipmentIds, equipmentIds);
      if (line.id === undefined) return;
      if (seen.has(line.id)) fields[`${path}.id`] = 'DUPLICATE_ID';
      else if (!existing.has(line.id)) fields[`${path}.id`] = 'UNKNOWN_ID';
      seen.add(line.id);
    };
    lines.forEach((main, i) => {
      check(`steps.${String(i)}`, main);
      (main.children ?? []).forEach((child, j) => {
        check(`steps.${String(i)}.children.${String(j)}`, child);
      });
    });
    if (Object.keys(fields).length > 0) {
      throw new AppException(
        400,
        ERROR_CODES.VALIDATION_FAILED,
        'A step names a row this recipe does not have',
        fields,
      );
    }

    const kept = [...seen];
    // What the rows named before this body: a photo a deleted or re-pictured step had goes too.
    const before = new Map(
      (
        await tx
          .select({ id: steps.id, imageKey: steps.imageKey })
          .from(steps)
          .where(eq(steps.recipeId, recipeId))
      ).map((r) => [r.id, r.imageKey]),
    );
    const dropped: (string | null)[] = [];
    for (const [rowId, key] of before) if (!seen.has(rowId)) dropped.push(key);
    const noteReplaced = (line: StepLine) => {
      if (line.id === undefined) return;
      const old = before.get(line.id) ?? null;
      if (old !== null && old !== (line.imageKey ?? null)) dropped.push(old);
    };
    lines.forEach((main) => {
      noteReplaced(main);
      (main.children ?? []).forEach(noteReplaced);
    });
    // Deleting a parent cascades to its children, so every kept row is detached before
    // anything is deleted, and re-attached below with its new parent.
    if (kept.length > 0) {
      await tx.update(steps).set({ parentStepId: null }).where(inArray(steps.id, kept));
    }

    await tx
      .delete(steps)
      .where(
        kept.length > 0
          ? and(eq(steps.recipeId, recipeId), notInArray(steps.id, kept))
          : eq(steps.recipeId, recipeId),
      );

    for (const [position, main] of lines.entries()) {
      const mainId = await this.writeStep(tx, recipeId, main, null, position);
      for (const [childPosition, child] of (main.children ?? []).entries()) {
        await this.writeStep(tx, recipeId, child, mainId, childPosition);
      }
    }
    return dropped;
  }

  private async writeStep(
    tx: Tx,
    recipeId: string,
    line: StepLine,
    parentStepId: string | null,
    position: number,
  ): Promise<string> {
    const stepId = await this.writeStepRow(tx, recipeId, line, parentStepId, position);
    // Links are the whole truth per step, so the old set goes before the new one lands.
    await tx.delete(stepIngredients).where(eq(stepIngredients.stepId, stepId));
    await tx.delete(stepEquipment).where(eq(stepEquipment.stepId, stepId));
    const ingredientLinks = (line.ingredientIds ?? []).map((ingredientId) => ({
      stepId,
      ingredientId,
    }));
    const equipmentLinks = (line.equipmentIds ?? []).map((equipmentId) => ({
      stepId,
      equipmentId,
    }));
    if (ingredientLinks.length > 0) await tx.insert(stepIngredients).values(ingredientLinks);
    if (equipmentLinks.length > 0) await tx.insert(stepEquipment).values(equipmentLinks);
    return stepId;
  }

  private async writeStepRow(
    tx: Tx,
    recipeId: string,
    line: StepLine,
    parentStepId: string | null,
    position: number,
  ): Promise<string> {
    const values = {
      parentStepId,
      position,
      body: line.body,
      note: line.note ?? null,
      durationSeconds: line.durationSeconds ?? null,
      imageKey: line.imageKey ?? null,
      updatedAt: new Date(),
    };
    if (line.id === undefined) {
      const [inserted] = await tx
        .insert(steps)
        .values({ recipeId, ...values })
        .returning({ id: steps.id });
      if (inserted === undefined) throw new Error('insert returned nothing');
      return inserted.id;
    }
    await tx.update(steps).set(values).where(eq(steps.id, line.id));
    return line.id;
  }

  async remove(id: string): Promise<boolean> {
    const keys = [
      ...(await this.database.db
        .select({ key: steps.imageKey })
        .from(steps)
        .where(eq(steps.recipeId, id))),
    ].map((r) => r.key);
    const deleted = await this.database.db
      .delete(recipes)
      .where(eq(recipes.id, id))
      .returning({ coverImageKey: recipes.coverImageKey });
    if (deleted.length === 0) return false;
    // Cascades took the step rows with the recipe; the files follow once the delete stands.
    await this.images.remove([...keys, ...deleted.map((r) => r.coverImageKey)]);
    return true;
  }
}
