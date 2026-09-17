import {
  nestUnderPrevious,
  promote,
  removeMain,
  stepErrorsFromServer,
  validateSteps,
  type MainStepDraft,
} from './steps';

const main = (
  key: string,
  body: string,
  children: MainStepDraft['children'] = [],
): MainStepDraft => ({
  key,
  body,
  note: '',
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  children,
});
const child = (key: string, body: string) => ({
  key,
  body,
  note: '',
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
});

describe('validateSteps', () => {
  it('turns drafts into the nested body', () => {
    const result = validateSteps([
      { ...main('a', ' Heat the oven '), durationSeconds: 600 },
      main('b', 'Roast', [child('c', 'Chop the dill')]),
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

  it('marks the step and field at fault, nested ones included', () => {
    const result = validateSteps([main('a', '  '), main('b', 'Roast', [child('c', '')])]);
    expect(result).toEqual({
      ok: false,
      errors: { a: { body: true }, c: { body: true } },
    });
  });
});

describe('nesting and promoting', () => {
  it('nests a main step under the previous one, and promotes it back after its parent', () => {
    const nested = nestUnderPrevious([main('a', 'A'), main('b', 'B')], 1);
    expect(nested.map((m) => [m.key, m.children.map((c) => c.key)])).toEqual([['a', ['b']]]);
    const back = promote(nested, 0, 0);
    expect(back.map((m) => [m.key, m.children.length])).toEqual([
      ['a', 0],
      ['b', 0],
    ]);
  });

  it('refuses to nest a step that has nested steps of its own', () => {
    const drafts = [main('a', 'A'), main('b', 'B', [child('c', 'C')])];
    expect(nestUnderPrevious(drafts, 1)).toEqual(drafts);
  });

  /** The promotion rule: removing a parent leaves its children in its place. */
  it('promotes nested steps in place when their main step is removed', () => {
    const removed = removeMain(
      [main('a', 'A'), main('b', 'B', [child('c', 'C'), child('d', 'D')]), main('e', 'E')],
      1,
    );
    expect(removed.map((m) => m.key)).toEqual(['a', 'c', 'd', 'e']);
  });
});

describe('stepErrorsFromServer', () => {
  it('maps a nested path to the child line', () => {
    const drafts = [main('a', 'A'), main('b', 'B', [child('c', 'C'), child('d', 'D')])];
    expect(
      stepErrorsFromServer(
        { 'steps.1.children.1.body': 'TOO_SMALL', 'steps.0.durationSeconds': 'TOO_BIG' },
        drafts,
      ),
    ).toEqual({
      d: { body: true },
      a: { duration: true },
    });
  });
});
