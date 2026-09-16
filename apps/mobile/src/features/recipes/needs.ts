import type { Equipment, EquipmentInput, Ingredient, IngredientInput, Unit } from '@panna/shared';

/** What the editor holds for a line: text, always, because that is what a field gives back. */
export interface IngredientDraft {
  readonly key: string;
  readonly id?: string;
  readonly name: string;
  readonly amount: string;
  readonly unit: Unit | null;
  readonly note: string;
}

export interface EquipmentDraft {
  readonly key: string;
  readonly id?: string;
  readonly name: string;
  readonly note: string;
  readonly optional: boolean;
}

export interface NeedsDraft {
  readonly ingredients: readonly IngredientDraft[];
  readonly equipment: readonly EquipmentDraft[];
}

export type LineField = 'name' | 'amount' | 'unit';
/** Keyed by line key, then by the field that is wrong. */
export type NeedsErrors = Readonly<Record<string, Partial<Record<LineField, true>>>>;

export const EMPTY_NEEDS: NeedsDraft = { ingredients: [], equipment: [] };

let nextKey = 0;
/** Keys outlive ids: a new line has no id until it is saved, but it needs a key from the start. */
export function newKey(): string {
  nextKey += 1;
  return `line-${String(nextKey)}`;
}

export function draftFrom(
  ingredients: readonly Ingredient[],
  equipment: readonly Equipment[],
): NeedsDraft {
  return {
    ingredients: ingredients.map((line) => ({
      key: line.id,
      id: line.id,
      name: line.name,
      amount: line.amount === null ? '' : String(line.amount),
      unit: line.unit,
      note: line.note ?? '',
    })),
    equipment: equipment.map((line) => ({
      key: line.id,
      id: line.id,
      name: line.name,
      note: line.note ?? '',
      optional: line.optional,
    })),
  };
}

export function emptyIngredient(): IngredientDraft {
  return { key: newKey(), name: '', amount: '', unit: null, note: '' };
}

export function emptyEquipment(): EquipmentDraft {
  return { key: newKey(), name: '', note: '', optional: false };
}

/** Decimals only, per 0007: `1.5` or `1,5`, never `1/2`. */
const DECIMAL = /^\d{1,5}([.,]\d{1,2})?$/;

export function parseAmount(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!DECIMAL.test(trimmed)) return undefined;
  const value = Number(trimmed.replace(',', '.'));
  return value > 0 ? value : undefined;
}

export function move<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(to, 0, item);
  return next;
}

export type NeedsOutcome =
  | {
      readonly ok: true;
      readonly ingredients: IngredientInput[];
      readonly equipment: EquipmentInput[];
    }
  | { readonly ok: false; readonly errors: NeedsErrors };

/**
 * The same rules the API applies, checked before anything is sent so the line at fault
 * is marked rather than the whole form failing.
 */
export function validateNeeds(draft: NeedsDraft): NeedsOutcome {
  const errors: Record<string, Partial<Record<LineField, true>>> = {};
  const flag = (key: string, field: LineField) => {
    errors[key] = { ...errors[key], [field]: true };
  };

  const ingredients: IngredientInput[] = draft.ingredients.map((line) => {
    if (line.name.trim() === '') flag(line.key, 'name');
    const amount = parseAmount(line.amount);
    if (amount === undefined) flag(line.key, 'amount');
    // A bad amount is one error, not two: the unit is only at fault when nothing was typed.
    if (line.unit !== null && amount === null) flag(line.key, 'unit');
    return {
      ...(line.id === undefined ? {} : { id: line.id }),
      name: line.name.trim(),
      note: line.note.trim() === '' ? null : line.note.trim(),
      amount: amount ?? null,
      unit: line.unit,
    };
  });

  const equipment: EquipmentInput[] = draft.equipment.map((line) => {
    if (line.name.trim() === '') flag(line.key, 'name');
    return {
      ...(line.id === undefined ? {} : { id: line.id }),
      name: line.name.trim(),
      note: line.note.trim() === '' ? null : line.note.trim(),
      optional: line.optional,
    };
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, ingredients, equipment };
}

/**
 * The API names a bad line by its index, `ingredients.3.name`; the editor knows lines
 * by key. This turns one into the other.
 */
export function errorsFromServer(
  fields: Readonly<Record<string, string>>,
  draft: NeedsDraft,
): NeedsErrors {
  const errors: Record<string, Partial<Record<LineField, true>>> = {};
  for (const path of Object.keys(fields)) {
    const match = /^(ingredients|equipment)\.(\d+)\.(name|amount|unit|note|id)$/.exec(path);
    if (match === null) continue;
    const list = match[1] === 'ingredients' ? draft.ingredients : draft.equipment;
    const line = list[Number(match[2])];
    if (line === undefined) continue;
    const field: LineField =
      match[3] === 'amount' ? 'amount' : match[3] === 'unit' ? 'unit' : 'name';
    errors[line.key] = { ...errors[line.key], [field]: true };
  }
  return errors;
}
