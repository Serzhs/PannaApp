import type { NestedStepInput, Step, StepInput, UnitSystem } from '@panna/shared';

import { newKey } from './needs';

import { fromCelsius, toCelsius } from '@/features/units/convert';

/** What the editor holds for a step. Temperature is text in the author's own unit. */
export interface StepDraft {
  readonly key: string;
  readonly id?: string;
  readonly body: string;
  readonly note: string;
  readonly durationSeconds: number | null;
  readonly temperature: string;
  readonly ingredientIds: readonly string[];
  readonly equipmentIds: readonly string[];
}

export interface MainStepDraft extends StepDraft {
  readonly children: readonly StepDraft[];
}

export type StepField = 'body' | 'temperature' | 'duration' | 'links';
export type StepErrors = Readonly<Record<string, Partial<Record<StepField, true>>>>;

export function emptyStep(): StepDraft {
  return {
    key: newKey(),
    body: '',
    note: '',
    durationSeconds: null,
    temperature: '',
    ingredientIds: [],
    equipmentIds: [],
  };
}

export function emptyMainStep(): MainStepDraft {
  return { ...emptyStep(), children: [] };
}

function draftOf(step: Step['children'][number], system: UnitSystem): StepDraft {
  return {
    key: step.id,
    id: step.id,
    body: step.body,
    note: step.note ?? '',
    durationSeconds: step.durationSeconds,
    temperature:
      step.temperatureCelsius === null ? '' : String(fromCelsius(step.temperatureCelsius, system)),
    ingredientIds: step.ingredientIds,
    equipmentIds: step.equipmentIds,
  };
}

export function draftFromSteps(steps: readonly Step[], system: UnitSystem): MainStepDraft[] {
  return steps.map((step) => ({
    ...draftOf(step, system),
    children: step.children.map((c) => draftOf(c, system)),
  }));
}

const WHOLE = /^-?\d{1,3}$/;

/** A whole number in the author's unit, or null for blank, or undefined for nonsense. */
export function parseTemperature(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return WHOLE.test(trimmed) ? Number(trimmed) : undefined;
}

export type StepsOutcome =
  | { readonly ok: true; readonly steps: StepInput[] }
  | { readonly ok: false; readonly errors: StepErrors };

/** The same rules the API applies, with the temperature turned into the Celsius it stores. */
export function validateSteps(drafts: readonly MainStepDraft[], system: UnitSystem): StepsOutcome {
  const errors: Record<string, Partial<Record<StepField, true>>> = {};
  const flag = (key: string, field: StepField) => {
    errors[key] = { ...errors[key], [field]: true };
  };

  const one = (draft: StepDraft): NestedStepInput => {
    if (draft.body.trim() === '') flag(draft.key, 'body');
    const typed = parseTemperature(draft.temperature);
    if (typed === undefined) flag(draft.key, 'temperature');
    if (
      draft.durationSeconds !== null &&
      (draft.durationSeconds < 1 || draft.durationSeconds > 86400)
    ) {
      flag(draft.key, 'duration');
    }
    return {
      ...(draft.id === undefined ? {} : { id: draft.id }),
      body: draft.body.trim(),
      note: draft.note.trim() === '' ? null : draft.note.trim(),
      durationSeconds: draft.durationSeconds,
      temperatureCelsius: typed == null ? null : toCelsius(typed, system),
      ingredientIds: [...draft.ingredientIds],
      equipmentIds: [...draft.equipmentIds],
    };
  };

  const steps: StepInput[] = drafts.map((main) => ({
    ...one(main),
    children: main.children.map(one),
  }));

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, steps };
}

export function moveMain(
  drafts: readonly MainStepDraft[],
  from: number,
  to: number,
): MainStepDraft[] {
  const next = [...drafts];
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(to, 0, item);
  return next;
}

export function moveChild(
  drafts: readonly MainStepDraft[],
  parent: number,
  from: number,
  to: number,
): MainStepDraft[] {
  return drafts.map((main, i) => {
    if (i !== parent) return main;
    const children = [...main.children];
    const [item] = children.splice(from, 1);
    if (item !== undefined) children.splice(to, 0, item);
    return { ...main, children };
  });
}

/** A main step with nothing nested joins the previous main step's children. */
export function nestUnderPrevious(
  drafts: readonly MainStepDraft[],
  index: number,
): MainStepDraft[] {
  const step = drafts[index];
  const previous = drafts[index - 1];
  if (step === undefined || previous === undefined || step.children.length > 0) return [...drafts];
  const asChild: StepDraft = {
    key: step.key,
    body: step.body,
    note: step.note,
    durationSeconds: step.durationSeconds,
    temperature: step.temperature,
    ingredientIds: step.ingredientIds,
    equipmentIds: step.equipmentIds,
    ...(step.id === undefined ? {} : { id: step.id }),
  };
  return drafts.flatMap((main, i) => {
    if (i === index) return [];
    if (i === index - 1) return [{ ...main, children: [...main.children, asChild] }];
    return [main];
  });
}

/** A nested step becomes a main step just after its parent. */
export function promote(
  drafts: readonly MainStepDraft[],
  parent: number,
  child: number,
): MainStepDraft[] {
  const main = drafts[parent];
  const step = main?.children[child];
  if (main === undefined || step === undefined) return [...drafts];
  return drafts.flatMap((m, i) =>
    i === parent
      ? [
          { ...m, children: m.children.filter((_, j) => j !== child) },
          { ...step, children: [] },
        ]
      : [m],
  );
}

/**
 * Removing a main step promotes its nested steps in its place, mirroring the server
 * rule, so the editor never shows a state the server would refuse.
 */
export function removeMain(drafts: readonly MainStepDraft[], index: number): MainStepDraft[] {
  return drafts.flatMap((main, i) =>
    i === index ? main.children.map((child) => ({ ...child, children: [] })) : [main],
  );
}

export function removeChild(
  drafts: readonly MainStepDraft[],
  parent: number,
  child: number,
): MainStepDraft[] {
  return drafts.map((main, i) =>
    i === parent ? { ...main, children: main.children.filter((_, j) => j !== child) } : main,
  );
}

/** `steps.2.children.1.body` back to the key of that line. */
export function stepErrorsFromServer(
  fields: Readonly<Record<string, string>>,
  drafts: readonly MainStepDraft[],
): StepErrors {
  const errors: Record<string, Partial<Record<StepField, true>>> = {};
  for (const path of Object.keys(fields)) {
    const match =
      /^steps\.(\d+)(?:\.children\.(\d+))?\.(body|note|durationSeconds|temperatureCelsius|id|ingredientIds|equipmentIds)$/.exec(
        path,
      );
    if (match === null) continue;
    const main = drafts[Number(match[1])];
    const line = match[2] === undefined ? main : main?.children[Number(match[2])];
    if (line === undefined) continue;
    const field: StepField =
      match[3] === 'durationSeconds'
        ? 'duration'
        : match[3] === 'temperatureCelsius'
          ? 'temperature'
          : match[3] === 'ingredientIds' || match[3] === 'equipmentIds'
            ? 'links'
            : 'body';
    errors[line.key] = { ...errors[line.key], [field]: true };
  }
  return errors;
}
