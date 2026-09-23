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
  /** The check of what you have comes first (0013); cooking is the guide. */
  readonly phase: 'check' | 'cooking';
  /** Ingredients being gone without, by id. Names for history come from the recipe copy. */
  readonly excluded: readonly string[];
  readonly currentStepId: string;
  readonly done: readonly string[];
  readonly timer: CookTimer | null;
  /**
   * Whose cook this is. Progress lives on the device, and a phone can be signed into by
   * more than one person over time; a record shows only to the person who started it.
   * Absent on records from before this field, which then show to nobody signed in.
   */
  readonly userId?: string | null;
}

type MainStep = RecipeDetail['steps'][number];
type AnyStep = MainStep | MainStep['children'][number];

let cache: readonly CookRecord[] | null = null;
const listeners = new Set<() => void>();
let owner: string | null = null;

/** The signed-in person, or null. Set by the session; every read and start goes through it. */
export function setCookOwner(userId: string | null): void {
  if (owner === userId) return;
  owner = userId;
  publish();
}

export function cookOwner(): string | null {
  return owner;
}

function owned(record: CookRecord): boolean {
  return (record.userId ?? null) === owner;
}

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
      const parsed = JSON.parse(raw) as Partial<CookRecord> & Pick<CookRecord, 'recipe'>;
      // A record from before 0013 was already cooking, with nothing left out.
      const record = { phase: 'cooking', excluded: [], ...parsed } as CookRecord;
      if (owned(record)) records.push(record);
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
    phase: 'check',
    excluded: [],
    currentStepId: first.id,
    done: [],
    timer: null,
    userId: owner,
  };
  saveCook(record);
  return record;
}

/** A step is skipped only when it linked ingredients and every one of them is gone (0013). */
export function isLive(step: AnyStep, excluded: readonly string[]): boolean {
  return step.ingredientIds.length === 0 || step.ingredientIds.some((id) => !excluded.includes(id));
}

/** The main steps this cook actually runs over, each with only its live meanwhile steps. */
export function liveSteps(record: CookRecord): MainStep[] {
  return record.recipe.steps
    .filter((step) => isLive(step, record.excluded))
    .map((step) => ({
      ...step,
      children: step.children.filter((child) => isLive(child, record.excluded)),
    }));
}

export function skippedCount(record: CookRecord): number {
  return record.recipe.steps.length - liveSteps(record).length;
}

/** Minutes for the live main steps, the way the recipe's own total is derived. */
export function liveMinutes(record: CookRecord): number | null {
  const seconds = liveSteps(record)
    .map((step) => step.durationSeconds ?? 0)
    .reduce((sum, value) => sum + value, 0);
  return seconds === 0 ? null : Math.ceil(seconds / 60);
}

export function toggleExcluded(record: CookRecord, ingredientId: string): CookRecord {
  const excluded = record.excluded.includes(ingredientId)
    ? record.excluded.filter((id) => id !== ingredientId)
    : [...record.excluded, ingredientId];
  return { ...record, excluded };
}

/** Leaves the check for the guide, landing on the first step that is still live. */
export function beginCooking(record: CookRecord): CookRecord | null {
  const first = liveSteps(record)[0];
  if (first === undefined) return null;
  return { ...record, phase: 'cooking', currentStepId: first.id };
}

export function stepIndex(record: CookRecord): number {
  return liveSteps(record).findIndex((step) => step.id === record.currentStepId);
}

export function currentStep(record: CookRecord): MainStep | undefined {
  return liveSteps(record)[stepIndex(record)];
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
  const next = liveSteps(record)[index + 1];
  const done = isDone(record, record.currentStepId)
    ? record.done
    : [...record.done, record.currentStepId];
  if (next === undefined) return { kind: 'finished' };
  return { kind: 'next', record: { ...record, done, currentStepId: next.id } };
}

/** Back only moves; what was marked stays marked. */
export function goBack(record: CookRecord): CookRecord {
  const previous = liveSteps(record)[stepIndex(record) - 1];
  return previous === undefined ? record : { ...record, currentStepId: previous.id };
}

export function setTimer(record: CookRecord, timer: CookTimer | null): CookRecord {
  return { ...record, timer };
}
