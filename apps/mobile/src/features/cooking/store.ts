import type { RecipeDetail } from '@panna/shared';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

const PREFIX = 'panna.cook.';

export interface CookTimer {
  readonly stepId: string;
  readonly endsAt: number;
  /** Null when notifications were refused: the timer then only shows on screen. */
  readonly notificationId: string | null;
}

/**
 * One cook of one recipe, on the device only (0012). `recipe` is a copy taken when the
 * cook starts, which is what makes cooking need nothing from the network afterwards.
 */
export interface CookRecord {
  readonly recipe: RecipeDetail;
  readonly startedAt: string;
  readonly currentStepId: string;
  readonly done: readonly string[];
  readonly timer: CookTimer | null;
}

let cache: readonly CookRecord[] | null = null;
const listeners = new Set<() => void>();

function keyOf(recipeId: string): string {
  return `${PREFIX}${recipeId}`;
}

function readAll(): readonly CookRecord[] {
  const records: CookRecord[] = [];
  for (const key of Storage.getAllKeysSync()) {
    if (!key.startsWith(PREFIX)) continue;
    const raw = Storage.getItemSync(key);
    if (raw === null) continue;
    try {
      records.push(JSON.parse(raw) as CookRecord);
    } catch {
      // A record that no longer parses is a record from a version this app cannot read.
      Storage.removeItemSync(key);
    }
  }
  return records.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function snapshot(): readonly CookRecord[] {
  cache ??= readAll();
  return cache;
}

function publish(): void {
  cache = readAll();
  for (const listener of listeners) listener();
}

export function loadCook(recipeId: string): CookRecord | null {
  return snapshot().find((record) => record.recipe.id === recipeId) ?? null;
}

export function saveCook(record: CookRecord): void {
  Storage.setItemSync(keyOf(record.recipe.id), JSON.stringify(record));
  publish();
}

export function clearCook(recipeId: string): void {
  Storage.removeItemSync(keyOf(recipeId));
  publish();
}

/** Every cook in progress, newest first, re-read whenever one changes. */
export function useCooks(): readonly CookRecord[] {
  return useSyncExternalStore((onChange) => {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, snapshot);
}

export function startCook(recipe: RecipeDetail, now: number = Date.now()): CookRecord | null {
  const first = recipe.steps[0];
  if (first === undefined) return null;
  const record: CookRecord = {
    recipe,
    startedAt: new Date(now).toISOString(),
    currentStepId: first.id,
    done: [],
    timer: null,
  };
  saveCook(record);
  return record;
}

export function stepIndex(record: CookRecord): number {
  return record.recipe.steps.findIndex((step) => step.id === record.currentStepId);
}

export function currentStep(record: CookRecord): RecipeDetail['steps'][number] | undefined {
  return record.recipe.steps[stepIndex(record)];
}

export function isDone(record: CookRecord, stepId: string): boolean {
  return record.done.includes(stepId);
}

/** A meanwhile step's mark flips on its own; the main step stays where it is. */
export function toggleDone(record: CookRecord, stepId: string): CookRecord {
  const done = isDone(record, stepId)
    ? record.done.filter((id) => id !== stepId)
    : [...record.done, stepId];
  return { ...record, done };
}

export type Advance =
  { readonly kind: 'next'; readonly record: CookRecord } | { readonly kind: 'finished' };

/** Done marks the current main step and moves on; on the last step the cook is over. */
export function advance(record: CookRecord): Advance {
  const index = stepIndex(record);
  const next = record.recipe.steps[index + 1];
  const done = isDone(record, record.currentStepId)
    ? record.done
    : [...record.done, record.currentStepId];
  if (next === undefined) return { kind: 'finished' };
  return { kind: 'next', record: { ...record, done, currentStepId: next.id } };
}

/** Back only moves; what was marked stays marked. */
export function goBack(record: CookRecord): CookRecord {
  const previous = record.recipe.steps[stepIndex(record) - 1];
  return previous === undefined ? record : { ...record, currentStepId: previous.id };
}

export function setTimer(record: CookRecord, timer: CookTimer | null): CookRecord {
  return { ...record, timer };
}
