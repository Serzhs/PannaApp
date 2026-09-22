import { extractJson, parseImport } from './parse';

const DOC = {
  schemaVersion: 1,
  title: 'Cold beetroot soup',
  servings: 4,
  ingredients: [
    { name: 'beetroot', amount: 500, unit: 'g' },
    { name: 'dill', amount: 'a bunch', unit: 'handful' },
    { amount: 2 },
  ],
  equipment: [{ name: 'pot' }],
  steps: [
    {
      body: 'Boil the beetroot',
      minutes: 45,
      ingredients: ['beetroot', 'carrots'],
      equipment: ['pot'],
      meanwhile: [{ body: 'Chop the dill', ingredients: ['dill'] }],
    },
    { note: 'no body here' },
  ],
};

/** What a model actually sends back: fences, a greeting, a sign-off. */
const CHATTY = `Here's your recipe!\n\n\`\`\`json\n${JSON.stringify(DOC, null, 2)}\n\`\`\`\n\nEnjoy your soup :)`;

describe('extractJson', () => {
  it('finds the object inside fences and prose, braces in strings included', () => {
    expect(extractJson('hi {"a": "x } y", "b": {"c": 1}} bye')).toBe(
      '{"a": "x } y", "b": {"c": 1}}',
    );
    expect(extractJson('nothing here')).toBeNull();
  });
});

describe('parseImport', () => {
  /** The criteria: fences and prose are fine; each refusal has its own reason. */
  it('reads a chatty answer, and refuses what it cannot read with a reason', () => {
    expect(parseImport(CHATTY).ok).toBe(true);
    expect(parseImport('Sorry, I cannot read that link.')).toEqual({ ok: false, reason: 'noJson' });
    expect(parseImport('{"schemaVersion": 1, "title": }')).toEqual({
      ok: false,
      reason: 'invalidJson',
    });
    expect(parseImport('{"schemaVersion": 2, "title": "x"}')).toEqual({
      ok: false,
      reason: 'unknownVersion',
    });
    expect(parseImport('{"schemaVersion": 1}')).toEqual({ ok: false, reason: 'noTitle' });
  });

  /** The criterion: everything readable comes in; five problems are named; meanwhile nests. */
  it('keeps what it can and lists what it could not', () => {
    const outcome = parseImport(CHATTY);
    if (!outcome.ok) throw new Error('expected ok');
    expect(outcome.recipe.ingredients).toEqual([
      { name: 'beetroot', note: null, amount: 500, unit: 'g' },
      { name: 'dill', note: null, amount: null, unit: null },
    ]);
    expect(outcome.recipe.steps).toHaveLength(1);
    expect(outcome.recipe.steps[0]?.durationSeconds).toBe(2700);
    expect(outcome.recipe.steps[0]?.ingredientNames).toEqual(['beetroot']);
    expect(outcome.recipe.steps[0]?.equipmentNames).toEqual(['pot']);
    expect(outcome.recipe.steps[0]?.children.map((c) => c.body)).toEqual(['Chop the dill']);
    expect(outcome.problems.map((p) => p.kind).sort()).toEqual(
      ['badAmount', 'ingredientDropped', 'stepDropped', 'unknownLink', 'unknownUnit'].sort(),
    );
  });

  /** The criterion: 101 ingredients import 100 and say so. */
  it('cuts a list at its cap and says so', () => {
    const many = {
      schemaVersion: 1,
      title: 'x',
      servings: 2,
      ingredients: Array.from({ length: 101 }, (_, i) => ({ name: `i${String(i)}` })),
    };
    const outcome = parseImport(JSON.stringify(many));
    if (!outcome.ok) throw new Error('expected ok');
    expect(outcome.recipe.ingredients).toHaveLength(100);
    expect(outcome.problems).toEqual([{ kind: 'tooMany', list: 'ingredients', max: 100 }]);
  });

  it('guesses servings when none are given, and says so', () => {
    const outcome = parseImport('{"schemaVersion": 1, "title": "x"}');
    if (!outcome.ok) throw new Error('expected ok');
    expect(outcome.recipe.servings).toBe(4);
    expect(outcome.problems).toEqual([{ kind: 'servingsGuessed' }]);
  });
});
