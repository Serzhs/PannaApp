import {
  draftFrom,
  errorsFromServer,
  move,
  parseAmount,
  validateNeeds,
  type NeedsDraft,
} from './needs';

const line = (over: Partial<NeedsDraft['ingredients'][number]>) => ({
  key: 'k',
  name: 'Beetroot',
  amount: '',
  unit: null,
  note: '',
  ...over,
});

describe('parseAmount', () => {
  /** The criterion: decimals only. 1.5 saves, 1/2 marks the line. */
  it.each([
    ['1.5', 1.5],
    ['1,5', 1.5],
    ['500', 500],
    ['', null],
    ['   ', null],
    ['1/2', undefined],
    ['0', undefined],
    ['1.005', undefined],
    ['abc', undefined],
    ['-1', undefined],
  ])('reads %p as %p', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });
});

describe('validateNeeds', () => {
  it('turns drafts into the body the API takes', () => {
    const result = validateNeeds({
      ingredients: [
        line({ key: 'a', id: 'id-a', name: ' Beetroot ', amount: '500', unit: 'g' }),
        line({ key: 'b', name: 'Salt', note: ' to taste ' }),
      ],
      equipment: [{ key: 'c', name: 'Grater', note: '', optional: true }],
    });
    expect(result).toEqual({
      ok: true,
      ingredients: [
        { id: 'id-a', name: 'Beetroot', note: null, amount: 500, unit: 'g' },
        { name: 'Salt', note: 'to taste', amount: null, unit: null },
      ],
      equipment: [{ name: 'Grater', note: null, optional: true }],
    });
  });

  it('marks the line and field at fault', () => {
    const result = validateNeeds({
      ingredients: [
        line({ key: 'blank', name: '  ' }),
        line({ key: 'fraction', amount: '1/2', unit: 'cup' }),
        line({ key: 'unitless', unit: 'g' }),
      ],
      equipment: [{ key: 'tool', name: '', note: '', optional: false }],
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        blank: { name: true },
        fraction: { amount: true },
        unitless: { unit: true },
        tool: { name: true },
      },
    });
  });
});

describe('move', () => {
  it('moves an item from one index to another', () => {
    expect(move(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(move(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
});

describe('errorsFromServer', () => {
  it('maps an index in a field path back to the line key', () => {
    const draft = draftFrom(
      [
        { id: 'x', position: 0, name: 'A', note: null, amount: null, unit: null },
        { id: 'y', position: 1, name: 'B', note: null, amount: null, unit: null },
      ],
      [],
    );
    expect(
      errorsFromServer({ 'ingredients.1.amount': 'TOO_SMALL', title: 'TOO_BIG' }, draft),
    ).toEqual({
      y: { amount: true },
    });
  });
});
