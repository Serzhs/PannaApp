import type { RecipeDetail } from '@panna/shared';

import {
  advance,
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
  ingredients: [],
  equipment: [],
  steps: [
    { id: 'a', position: 0, body: 'Boil', ...base, durationSeconds: 1200, children: [] },
    {
      id: 'b',
      position: 1,
      body: 'Roast',
      ...base,
      children: [{ id: 'b1', position: 0, body: 'Chop the dill', ...base }],
    },
    { id: 'c', position: 2, body: 'Blend', ...base, children: [] },
  ],
};

function must<T>(value: T | null): T {
  if (value === null) throw new Error('expected a record');
  return value;
}

describe('the cook store', () => {
  afterEach(() => {
    clearCook(recipe.id);
  });

  /** The criteria: start writes the whole recipe and the first step; Done moves on; Finish clears. */
  it('starts on the first step with the whole recipe copied, and moves on with Done', () => {
    const started = startCook(recipe);
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
    expect(advance(second.record)).toEqual({ kind: 'finished' });
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
});
