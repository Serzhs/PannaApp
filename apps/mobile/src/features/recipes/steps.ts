import type { NestedStepInput, Step, StepInput } from '@panna/shared';

import { newKey } from './needs';

/**
 * What the editor holds for a step. The list is flat and in reading order; `during` is
 * the key of the main step this one runs during, or null for a main step (0022).
 */
export interface StepDraft {
  readonly key: string;
  readonly id?: string;
  readonly body: string;
  readonly note: string;
  readonly durationSeconds: number | null;
  readonly ingredientIds: readonly string[];
  readonly equipmentIds: readonly string[];
  readonly during: string | null;
  /** The photo of the result, already uploaded (0011). */
  readonly imageKey: string | null;
}

export type StepField = 'body' | 'duration' | 'links';
export type StepErrors = Readonly<Record<string, Partial<Record<StepField, true>>>>;

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const TITLE_LENGTH = 60;

export function emptyStep(): StepDraft {
  return {
    key: newKey(),
    body: '',
    note: '',
    durationSeconds: null,
    ingredientIds: [],
    equipmentIds: [],
    during: null,
    imageKey: null,
  };
}

function draftOf(step: Step['children'][number], during: string | null): StepDraft {
  return {
    key: step.id,
    id: step.id,
    body: step.body,
    note: step.note ?? '',
    durationSeconds: step.durationSeconds,
    ingredientIds: step.ingredientIds,
    equipmentIds: step.equipmentIds,
    during,
    imageKey: step.imageKey,
  };
}

export function draftFromSteps(steps: readonly Step[]): StepDraft[] {
  return steps.flatMap((step) => [
    draftOf(step, null),
    ...step.children.map((child) => draftOf(child, step.id)),
  ]);
}

export function mainsOf(drafts: readonly StepDraft[]): StepDraft[] {
  return drafts.filter((draft) => draft.during === null);
}

export function childrenOf(drafts: readonly StepDraft[], key: string): StepDraft[] {
  return drafts.filter((draft) => draft.during === key);
}

/** Reading order: each main step followed by what runs during it. A step whose parent is gone becomes main. */
function normalize(drafts: readonly StepDraft[]): StepDraft[] {
  const keys = new Set(drafts.map((draft) => draft.key));
  const sane = drafts.map((draft) =>
    draft.during !== null && !keys.has(draft.during) ? { ...draft, during: null } : draft,
  );
  return mainsOf(sane).flatMap((main) => [main, ...childrenOf(sane, main.key)]);
}

/** How a step is named on screen: "2" for a main step, "2a" for one that runs during it. */
export function numberOf(
  drafts: readonly StepDraft[],
  key: string,
): { readonly number: number; readonly letter: string } | undefined {
  const draft = drafts.find((d) => d.key === key);
  if (draft === undefined) return undefined;
  const mains = mainsOf(drafts);
  if (draft.during === null) {
    return { number: mains.findIndex((m) => m.key === key) + 1, letter: '' };
  }
  const siblings = childrenOf(drafts, draft.during);
  return {
    number: mains.findIndex((m) => m.key === draft.during) + 1,
    letter: LETTERS[siblings.findIndex((s) => s.key === key)] ?? '',
  };
}

/** The Flow view names a step by the start of its instruction; there is no title field. */
export function stepTitle(body: string): string {
  const firstLine = body.trim().split('\n')[0]?.trim() ?? '';
  return firstLine.length > TITLE_LENGTH
    ? `${firstLine.slice(0, TITLE_LENGTH - 1).trimEnd()}…`
    : firstLine;
}

function siblingsOf(drafts: readonly StepDraft[], key: string): StepDraft[] {
  const draft = drafts.find((d) => d.key === key);
  if (draft === undefined) return [];
  return draft.during === null ? mainsOf(drafts) : childrenOf(drafts, draft.during);
}

export function canMoveUp(drafts: readonly StepDraft[], key: string): boolean {
  return siblingsOf(drafts, key).findIndex((s) => s.key === key) > 0;
}

export function canMoveDown(drafts: readonly StepDraft[], key: string): boolean {
  const siblings = siblingsOf(drafts, key);
  const index = siblings.findIndex((s) => s.key === key);
  return index >= 0 && index < siblings.length - 1;
}

/** A step moves among its own siblings only: a main step past main steps, a parallel one past its parent's others. */
export function moveStep(
  drafts: readonly StepDraft[],
  key: string,
  direction: -1 | 1,
): StepDraft[] {
  const siblings = siblingsOf(drafts, key);
  const from = siblings.findIndex((s) => s.key === key);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= siblings.length) return [...drafts];
  const other = siblings[to];
  if (other === undefined) return [...drafts];
  // Swapping the two rows in the flat list keeps every other row where it was.
  const swapped = drafts.map((draft) =>
    draft.key === key ? other : draft.key === other.key ? (siblings[from] ?? draft) : draft,
  );
  return normalize(swapped);
}

/** Main steps that could run during `parentKey`: any other main step with nothing running during it. */
export function candidatesFor(drafts: readonly StepDraft[], parentKey: string): StepDraft[] {
  return mainsOf(drafts).filter(
    (main) => main.key !== parentKey && childrenOf(drafts, main.key).length === 0,
  );
}

/** Makes `key` run during `parentKey`, after whatever already does. One level only. */
export function nestUnder(
  drafts: readonly StepDraft[],
  key: string,
  parentKey: string,
): StepDraft[] {
  if (!candidatesFor(drafts, parentKey).some((c) => c.key === key)) return [...drafts];
  return normalize(
    drafts.map((draft) => (draft.key === key ? { ...draft, during: parentKey } : draft)),
  );
}

/** Returns a parallel step to the main flow, just after the step it ran during. */
export function release(drafts: readonly StepDraft[], key: string): StepDraft[] {
  const draft = drafts.find((d) => d.key === key);
  const parent = draft?.during ?? null;
  if (draft === undefined || parent === null) return [...drafts];
  const asMain = { ...draft, during: null };
  const mains = mainsOf(drafts).flatMap((main) => (main.key === parent ? [main, asMain] : [main]));
  const rest = drafts.filter((d) => d.during !== null && d.key !== key);
  return normalize([...mains, ...rest]);
}

/**
 * Removing a main step makes what ran during it main steps in its place, mirroring the
 * server rule, so the editor never shows a state the server would refuse.
 */
export function removeStep(drafts: readonly StepDraft[], key: string): StepDraft[] {
  const mains = mainsOf(drafts).flatMap((main) =>
    main.key === key
      ? childrenOf(drafts, key).map((child) => ({ ...child, during: null }))
      : [main],
  );
  const rest = drafts.filter((d) => d.during !== null && d.during !== key && d.key !== key);
  return normalize([...mains, ...rest]);
}

export type StepFieldErrors = Partial<Record<StepField, true>>;

/** What is wrong with one step, checked on Add (0024) and again before sending. */
export function checkStep(draft: StepDraft): StepFieldErrors {
  const errors: Record<string, true> = {};
  if (draft.body.trim() === '') errors.body = true;
  if (
    draft.durationSeconds !== null &&
    (draft.durationSeconds < 1 || draft.durationSeconds > 86400)
  ) {
    errors.duration = true;
  }
  return errors;
}

/** The first step opens on its own (0024); left untouched, it is dropped rather than flagged. */
export function isBlankStep(draft: StepDraft): boolean {
  return (
    draft.id === undefined &&
    draft.body.trim() === '' &&
    draft.note.trim() === '' &&
    draft.durationSeconds === null &&
    draft.ingredientIds.length === 0 &&
    draft.equipmentIds.length === 0 &&
    draft.imageKey === null
  );
}

export function dropBlank(drafts: readonly StepDraft[]): StepDraft[] {
  return normalize(drafts.filter((draft) => !isBlankStep(draft)));
}

export type StepsOutcome =
  | { readonly ok: true; readonly steps: StepInput[] }
  | { readonly ok: false; readonly errors: StepErrors };

/** The same rules the API applies, with the flat list folded back into main steps and their children. */
export function validateSteps(drafts: readonly StepDraft[]): StepsOutcome {
  const errors: Record<string, Partial<Record<StepField, true>>> = {};
  const flag = (key: string, field: StepField) => {
    errors[key] = { ...errors[key], [field]: true };
  };

  const one = (draft: StepDraft): NestedStepInput => {
    for (const field of Object.keys(checkStep(draft)) as StepField[]) flag(draft.key, field);
    return {
      ...(draft.id === undefined ? {} : { id: draft.id }),
      body: draft.body.trim(),
      note: draft.note.trim() === '' ? null : draft.note.trim(),
      durationSeconds: draft.durationSeconds,
      ingredientIds: [...draft.ingredientIds],
      equipmentIds: [...draft.equipmentIds],
      imageKey: draft.imageKey,
    };
  };

  const steps: StepInput[] = mainsOf(drafts).map((main) => ({
    ...one(main),
    children: childrenOf(drafts, main.key).map(one),
  }));

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, steps };
}

/** `steps.2.children.1.body` back to the key of that line. */
export function stepErrorsFromServer(
  fields: Readonly<Record<string, string>>,
  drafts: readonly StepDraft[],
): StepErrors {
  const errors: Record<string, Partial<Record<StepField, true>>> = {};
  const mains = mainsOf(drafts);
  for (const path of Object.keys(fields)) {
    const match =
      /^steps\.(\d+)(?:\.children\.(\d+))?\.(body|note|durationSeconds|id|ingredientIds|equipmentIds)$/.exec(
        path,
      );
    if (match === null) continue;
    const main = mains[Number(match[1])];
    const line =
      match[2] === undefined || main === undefined
        ? main
        : childrenOf(drafts, main.key)[Number(match[2])];
    if (line === undefined) continue;
    const field: StepField =
      match[3] === 'durationSeconds'
        ? 'duration'
        : match[3] === 'ingredientIds' || match[3] === 'equipmentIds'
          ? 'links'
          : 'body';
    errors[line.key] = { ...errors[line.key], [field]: true };
  }
  return errors;
}
