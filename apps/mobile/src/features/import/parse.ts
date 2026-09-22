import {
  importDocumentSchema,
  importEquipmentSchema,
  importIngredientSchema,
  importNestedStepSchema,
  importStepSchema,
  IMPORT_SCHEMA_VERSION,
  MAX_EQUIPMENT,
  MAX_INGREDIENTS,
  MAX_MAIN_STEPS,
  MAX_NESTED_STEPS,
  unitSchema,
  type EquipmentInput,
  type ImportNestedStep,
  type IngredientInput,
  type NestedStepInput,
} from '@panna/shared';
import { z } from 'zod';

/** Steps as the API takes them, with links still by name: ids exist only after the recipe is created. */
export interface ImportedStep extends Omit<NestedStepInput, 'ingredientIds' | 'equipmentIds'> {
  readonly ingredientNames: readonly string[];
  readonly equipmentNames: readonly string[];
  readonly children: readonly Omit<ImportedStep, 'children'>[];
}

export interface ImportedRecipe {
  readonly title: string;
  readonly description: string | null;
  readonly servings: number;
  readonly ingredients: readonly IngredientInput[];
  readonly equipment: readonly EquipmentInput[];
  readonly steps: readonly ImportedStep[];
}

export type Problem =
  | { readonly kind: 'ingredientDropped'; readonly index: number }
  | { readonly kind: 'equipmentDropped'; readonly index: number }
  | { readonly kind: 'stepDropped'; readonly index: number }
  | { readonly kind: 'unknownUnit'; readonly name: string; readonly unit: string }
  | { readonly kind: 'badAmount'; readonly name: string }
  | { readonly kind: 'unknownLink'; readonly step: string; readonly name: string }
  | {
      readonly kind: 'tooMany';
      readonly list: 'ingredients' | 'equipment' | 'steps' | 'meanwhile';
      readonly max: number;
    }
  | { readonly kind: 'servingsGuessed' };

export type ParseOutcome =
  | { readonly ok: true; readonly recipe: ImportedRecipe; readonly problems: readonly Problem[] }
  | {
      readonly ok: false;
      readonly reason: 'noJson' | 'invalidJson' | 'unknownVersion' | 'noTitle';
    };

/** Real model output arrives in code fences, under "Here's your recipe!": the object inside is what counts. */
export function extractJson(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

const DEFAULT_SERVINGS = 4;
const looseRecord = z.record(z.unknown());
const looseList = z.array(z.unknown());

function asList(value: unknown): unknown[] {
  const parsed = looseList.safeParse(value);
  return parsed.success ? parsed.data : [];
}

function trimmed(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * Reads what it can (0016). A line it cannot read is dropped and named; a value it
 * cannot read becomes none and is named. One bad unit must not cost the whole recipe.
 */
export function parseImport(text: string): ParseOutcome {
  const json = extractJson(text);
  if (json === null) return { ok: false, reason: 'noJson' };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'invalidJson' };
  }
  const root = looseRecord.safeParse(raw);
  if (!root.success) return { ok: false, reason: 'invalidJson' };
  const doc = root.data;
  if (doc.schemaVersion !== IMPORT_SCHEMA_VERSION) return { ok: false, reason: 'unknownVersion' };
  const title = trimmed(doc.title);
  if (title === null) return { ok: false, reason: 'noTitle' };

  const problems: Problem[] = [];
  const head = importDocumentSchema
    .pick({ description: true, servings: true })
    .safeParse({ description: doc.description, servings: doc.servings });
  const description = head.success ? (head.data.description ?? null) : trimmed(doc.description);
  let servings = head.success ? (head.data.servings ?? null) : null;
  if (servings === null) {
    servings = DEFAULT_SERVINGS;
    problems.push({ kind: 'servingsGuessed' });
  }

  const cap = <T>(
    items: T[],
    max: number,
    list: Extract<Problem, { kind: 'tooMany' }>['list'],
  ): T[] => {
    if (items.length <= max) return items;
    problems.push({ kind: 'tooMany', list, max });
    return items.slice(0, max);
  };

  const ingredients: IngredientInput[] = [];
  cap(asList(doc.ingredients), MAX_INGREDIENTS, 'ingredients').forEach((item, index) => {
    const line = looseRecord.safeParse(item);
    const name = line.success ? trimmed(line.data.name) : null;
    if (!line.success || name === null) {
      problems.push({ kind: 'ingredientDropped', index: index + 1 });
      return;
    }
    let unit = line.data.unit;
    if (unit != null && !unitSchema.safeParse(unit).success) {
      problems.push({
        kind: 'unknownUnit',
        name,
        unit: typeof unit === 'string' ? unit : JSON.stringify(unit),
      });
      unit = null;
    }
    let amount = line.data.amount;
    if (amount != null && typeof amount !== 'number') {
      const asNumber = typeof amount === 'string' ? Number(amount.replace(',', '.')) : Number.NaN;
      amount = Number.isFinite(asNumber) && asNumber > 0 ? asNumber : null;
      if (amount === null) problems.push({ kind: 'badAmount', name });
    }
    const parsed = importIngredientSchema.safeParse({ ...line.data, name, unit, amount });
    if (!parsed.success) {
      problems.push({ kind: 'ingredientDropped', index: index + 1 });
      return;
    }
    const finalAmount = parsed.data.amount ?? null;
    ingredients.push({
      name: parsed.data.name,
      note: parsed.data.note ?? null,
      amount: finalAmount === null ? null : Math.round(finalAmount * 100) / 100,
      // A unit with no amount is refused by the API, so the unit goes rather than the line.
      unit: finalAmount === null ? null : (parsed.data.unit ?? null),
    });
  });

  const equipment: EquipmentInput[] = [];
  cap(asList(doc.equipment), MAX_EQUIPMENT, 'equipment').forEach((item, index) => {
    const parsed = importEquipmentSchema.safeParse(item);
    if (!parsed.success) {
      problems.push({ kind: 'equipmentDropped', index: index + 1 });
      return;
    }
    equipment.push({
      name: parsed.data.name,
      note: parsed.data.note ?? null,
      optional: parsed.data.optional ?? false,
    });
  });

  const ingredientNames = new Set(ingredients.map((line) => line.name.toLocaleLowerCase()));
  const equipmentNames = new Set(equipment.map((line) => line.name.toLocaleLowerCase()));
  const links = (
    step: string,
    names: readonly string[] | null | undefined,
    known: Set<string>,
  ): string[] =>
    (names ?? []).filter((name) => {
      const found = known.has(name.toLocaleLowerCase());
      if (!found) problems.push({ kind: 'unknownLink', step, name });
      return found;
    });
  const one = (parsed: ImportNestedStep): Omit<ImportedStep, 'children'> => ({
    body: parsed.body,
    note: parsed.note ?? null,
    durationSeconds:
      parsed.minutes == null || parsed.minutes === 0 ? null : Math.round(parsed.minutes * 60),
    ingredientNames: links(parsed.body, parsed.ingredients, ingredientNames),
    equipmentNames: links(parsed.body, parsed.equipment, equipmentNames),
    imageKey: null,
  });

  const steps: ImportedStep[] = [];
  cap(asList(doc.steps), MAX_MAIN_STEPS, 'steps').forEach((item, index) => {
    const parsed = importStepSchema.safeParse(item);
    if (!parsed.success) {
      problems.push({ kind: 'stepDropped', index: index + 1 });
      return;
    }
    const children: Omit<ImportedStep, 'children'>[] = [];
    cap(asList(parsed.data.meanwhile), MAX_NESTED_STEPS, 'meanwhile').forEach((child) => {
      const nested = importNestedStepSchema.safeParse(child);
      if (!nested.success) {
        problems.push({ kind: 'stepDropped', index: index + 1 });
        return;
      }
      children.push(one(nested.data));
    });
    steps.push({ ...one(parsed.data), children });
  });

  return {
    ok: true,
    recipe: { title, description, servings, ingredients, equipment, steps },
    problems,
  };
}
