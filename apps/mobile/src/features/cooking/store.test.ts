import type { RecipeDetail } from '@panna/shared';

import {
  advance,
  beginCooking,
  isLive,
  liveMinutes,
  liveSteps,
  skippedCount,
  toggleExcluded,
  clearCook,
  goBack,
  loadCook,
  saveCook,
  setTimer,
  startCook,
  stepIndex,
  toggleDone,
} from './store';

const base = {
  note: null,
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  imageKey: null,
};
const recipe: RecipeDetail = {
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  title: 'Cold beetroot soup',
  description: null,
  status: 'ready',
  coverImageKey: null,
  servings: 4,
  totalTimeMinutes: 45,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
  ingredients: [
    { id: 'beet', position: 0, name: 'beetroot', note: null, amount: 500, unit: 'g' },
    { id: 'dill', position: 1, name: 'dill', note: null, amount: null, unit: null },
  ],
  equipment: [],
  steps: [
    { id: 'a', position: 0, body: 'Boil', ...base, durationSeconds: 1200, children: [] },
    {
      id: 'b',
      position: 1,
      body: 'Roast',
      ...base,
      ingredientIds: ['beet', 'dill'],
      children: [
        { id: 'b1', position: 0, body: 'Chop the dill', ...base, ingredientIds: ['dill'] },
      ],
    },
    { id: 'c', position: 2, body: 'Blend', ...base, children: [] },
    {
      id: 'd',
      position: 3,
      body: 'Garnish with dill',
      ...base,
      durationSeconds: 120,
      ingredientIds: ['dill'],
      children: [],
    },
  ],
};

function mustStep<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('expected a step');
  return value;
}

function must<T>(value: T | null): T {
  if (value === null) throw new Error('expected a record');
  return value;
}

describe('the cook store', () => {
  afterEach(() => {
    clearCook(recipe.id);
  });

  /** The criteria: start writes the whole recipe and the first step; Done moves on; Finish clears. */
  it('starts at the check, on the first step with the whole recipe copied, and moves on with Done', () => {
    const started = startCook(recipe);
    expect(started?.phase).toBe('check');
    expect(started?.currentStepId).toBe('a');
    expect(loadCook(recipe.id)?.recipe).toEqual(recipe);

    const first = advance(must(started));
    expect(first.kind).toBe('next');
    if (first.kind !== 'next') return;
    expect(first.record.done).toEqual(['a']);
    expect(stepIndex(first.record)).toBe(1);
    saveCook(first.record);
    expect(loadCook(recipe.id)?.currentStepId).toBe('b');

    const second = advance(first.record);
    if (second.kind !== 'next') throw new Error('expected a next step');
    const third = advance(second.record);
    if (third.kind !== 'next') throw new Error('expected a next step');
    expect(advance(third.record)).toEqual({ kind: 'finished' });
    clearCook(recipe.id);
    expect(loadCook(recipe.id)).toBeNull();
  });

  it('refuses to start a recipe with no steps', () => {
    expect(startCook({ ...recipe, steps: [] })).toBeNull();
  });

  it('toggles a meanwhile step without moving the main step, and Back only moves', () => {
    const started = must(startCook(recipe));
    const onRoast = advance(started);
    if (onRoast.kind !== 'next') throw new Error('expected a next step');
    const ticked = toggleDone(onRoast.record, 'b1');
    expect(ticked.done).toContain('b1');
    expect(ticked.currentStepId).toBe('b');
    expect(toggleDone(ticked, 'b1').done).not.toContain('b1');
    const back = goBack(ticked);
    expect(back.currentStepId).toBe('a');
    expect(back.done).toEqual(['a', 'b1']);
    expect(goBack(started).currentStepId).toBe('a');
  });

  it('keeps a timer with the record, and clears it', () => {
    const started = must(startCook(recipe));
    const timed = setTimer(started, { stepId: 'a', endsAt: 1_000, notificationId: 'n1' });
    saveCook(timed);
    expect(loadCook(recipe.id)?.timer).toEqual({
      stepId: 'a',
      endsAt: 1_000,
      notificationId: 'n1',
    });
    saveCook(setTimer(timed, null));
    expect(loadCook(recipe.id)?.timer).toBeNull();
  });

  /** 0013: skipped only when every linked ingredient is gone; numbering closes up. */
  it('skips the steps whose every ingredient is excluded, and numbers over the rest', () => {
    const started = must(startCook(recipe));
    expect(skippedCount(started)).toBe(0);
    expect(liveMinutes(started)).toBe(22);

    const withoutDill = toggleExcluded(started, 'dill');
    expect(isLive(mustStep(recipe.steps[3]), withoutDill.excluded)).toBe(false);
    expect(liveSteps(withoutDill).map((s) => s.id)).toEqual(['a', 'b', 'c']);
    // Roast keeps its beetroot, but its meanwhile step was dill alone.
    expect(liveSteps(withoutDill)[1]?.children).toEqual([]);
    expect(skippedCount(withoutDill)).toBe(1);
    expect(liveMinutes(withoutDill)).toBe(20);

    const cooking = must(beginCooking(withoutDill));
    expect(cooking.phase).toBe('cooking');
    const onRoast = advance(cooking);
    if (onRoast.kind !== 'next') throw new Error('expected a next step');
    expect(stepIndex(onRoast.record)).toBe(1);
    const onBlend = advance(onRoast.record);
    if (onBlend.kind !== 'next') throw new Error('expected a next step');
    expect(advance(onBlend.record)).toEqual({ kind: 'finished' });
    expect(goBack(onBlend.record).currentStepId).toBe('b');

    expect(toggleExcluded(withoutDill, 'dill').excluded).toEqual([]);
  });

  it('never skips a step with no links, and refuses to begin with nothing live', () => {
    const started = must(startCook(recipe));
    const withoutBoth = toggleExcluded(toggleExcluded(started, 'dill'), 'beet');
    expect(liveSteps(withoutBoth).map((s) => s.id)).toEqual(['a', 'c']);
    const bare = { ...recipe, steps: [mustStep(recipe.steps[3])] };
    const only = must(startCook(bare));
    expect(beginCooking(toggleExcluded(only, 'dill'))).toBeNull();
    clearCook(bare.id);
  });

  it('reads a record from before the check as cooking with nothing excluded', () => {
    const started = must(startCook(recipe));
    const old = Object.fromEntries(
      Object.entries(started).filter(([key]) => key !== 'phase' && key !== 'excluded'),
    );
    // Written as the older shape on purpose: the store must read it, not the type system.
    saveCook(old as unknown as typeof started);
    expect(loadCook(recipe.id)?.phase).toBe('cooking');
    expect(loadCook(recipe.id)?.excluded).toEqual([]);
  });
});
