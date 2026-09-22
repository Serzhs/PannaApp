import { buildImportPrompt } from './prompt';

describe('buildImportPrompt', () => {
  /** The criterion: the language, the version and every unit are in it. */
  it('names the language, the version and the units, and asks for text over a link', () => {
    const prompt = buildImportPrompt('lv');
    expect(prompt).toContain('in Latvian');
    expect(prompt).toContain('"schemaVersion": 1');
    const units = [
      'g',
      'kg',
      'oz',
      'lb',
      'ml',
      'l',
      'tsp',
      'tbsp',
      'cup',
      'floz',
      'piece',
      'pinch',
      'clove',
      'slice',
    ];
    expect(prompt).toContain(units.join(', '));
    expect(prompt).toContain('meanwhile');
    expect(prompt).toMatch(/ask me for the text/);
  });
});
