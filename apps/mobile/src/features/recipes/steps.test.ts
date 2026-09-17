import {
  candidatesFor,
  canMoveDown,
  canMoveUp,
  draftFromSteps,
  moveStep,
  nestUnder,
  numberOf,
  release,
  removeStep,
  stepErrorsFromServer,
  stepTitle,
  validateSteps,
  type StepDraft,
} from './steps';

const step = (key: string, body: string, during: string | null = null): StepDraft => ({
  key,
  body,
  note: '',
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  during,
});

/** Heat; Roast with Chop and Boil during it; Serve. */
const FOUR = [
  step('a', 'Heat'),
  step('b', 'Roast'),
  step('c', 'Chop', 'b'),
  step('d', 'Boil', 'b'),
  step('e', 'Serve'),
];

describe('validateSteps', () => {
  /** The criterion: the body sent nests exactly what the Flow view shows. */
  it('folds the flat list into main steps and their children', () => {
    const result = validateSteps([
      { ...step('a', ' Heat the oven '), durationSeconds: 600 },
      step('b', 'Roast'),
      step('c', 'Chop the dill', 'b'),
    ]);
    expect(result).toEqual({
      ok: true,
      steps: [
        {
          body: 'Heat the oven',
          note: null,
          durationSeconds: 600,
          ingredientIds: [],
          equipmentIds: [],
          children: [],
        },
        {
          body: 'Roast',
          note: null,
          durationSeconds: null,
          ingredientIds: [],
          equipmentIds: [],
          children: [
            {
              body: 'Chop the dill',
              note: null,
              durationSeconds: null,
              ingredientIds: [],
              equipmentIds: [],
            },
          ],
        },
      ],
    });
  });

  it('marks the step and field at fault, parallel ones included', () => {
    const result = validateSteps([step('a', '  '), step('b', 'Roast'), step('c', '', 'b')]);
    expect(result).toEqual({
      ok: false,
      errors: { a: { body: true }, c: { body: true } },
    });
  });
});

describe('draftFromSteps', () => {
  it('lays the recipe out in reading order, each parallel step after its main one', () => {
    const base = { note: null, durationSeconds: null, ingredientIds: [], equipmentIds: [] };
    const drafts = draftFromSteps([
      { id: 'x', position: 0, body: 'Heat', ...base, children: [] },
      {
        id: 'y',
        position: 1,
        body: 'Roast',
        ...base,
        children: [{ id: 'z', position: 0, body: 'Chop', ...base }],
      },
    ]);
    expect(drafts.map((d) => [d.key, d.during])).toEqual([
      ['x', null],
      ['y', null],
      ['z', 'y'],
    ]);
  });
});

describe('the flow', () => {
  it('numbers main steps in order and parallel ones by letter under their step', () => {
    expect(numberOf(FOUR, 'b')).toEqual({ number: 2, letter: '' });
    expect(numberOf(FOUR, 'd')).toEqual({ number: 2, letter: 'b' });
    expect(numberOf(FOUR, 'e')).toEqual({ number: 3, letter: '' });
  });

  /** The criterion: a step with parallel steps is never offered, and never to itself. */
  it('offers only other main steps with nothing running during them', () => {
    expect(candidatesFor(FOUR, 'a').map((s) => s.key)).toEqual(['e']);
    expect(candidatesFor(FOUR, 'e').map((s) => s.key)).toEqual(['a']);
  });

  it('moves a step under another and releases it just after its former parent', () => {
    const nested = nestUnder(FOUR, 'e', 'a');
    expect(nested.map((s) => [s.key, s.during])).toEqual([
      ['a', null],
      ['e', 'a'],
      ['b', null],
      ['c', 'b'],
      ['d', 'b'],
    ]);
    const released = release(nested, 'c');
    expect(released.map((s) => s.key)).toEqual(['a', 'e', 'b', 'd', 'c']);
    expect(released.find((s) => s.key === 'c')?.during).toBeNull();
  });

  it('refuses to nest a step that has parallel steps of its own', () => {
    expect(nestUnder(FOUR, 'b', 'a')).toEqual(FOUR);
  });

  /** The promotion rule: removing Roast leaves Chop and Boil as main steps in its place. */
  it('makes the parallel steps main ones in place when their step is removed', () => {
    expect(removeStep(FOUR, 'b').map((s) => [s.key, s.during])).toEqual([
      ['a', null],
      ['c', null],
      ['d', null],
      ['e', null],
    ]);
  });

  it('moves a step among its siblings only', () => {
    expect(canMoveUp(FOUR, 'c')).toBe(false);
    expect(canMoveDown(FOUR, 'c')).toBe(true);
    expect(canMoveDown(FOUR, 'd')).toBe(false);
    expect(moveStep(FOUR, 'd', -1).map((s) => s.key)).toEqual(['a', 'b', 'd', 'c', 'e']);
    expect(moveStep(FOUR, 'e', -1).map((s) => s.key)).toEqual(['a', 'e', 'b', 'c', 'd']);
    expect(moveStep(FOUR, 'a', -1).map((s) => s.key)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('names a step by the start of its instruction', () => {
    expect(stepTitle('Roast the beetroot\nuntil soft')).toBe('Roast the beetroot');
    expect(stepTitle('x'.repeat(80))).toHaveLength(60);
  });
});

describe('stepErrorsFromServer', () => {
  it('maps a nested path to the parallel line', () => {
    expect(
      stepErrorsFromServer(
        { 'steps.1.children.1.body': 'TOO_SMALL', 'steps.0.durationSeconds': 'TOO_BIG' },
        FOUR,
      ),
    ).toEqual({
      d: { body: true },
      a: { duration: true },
    });
  });
});
