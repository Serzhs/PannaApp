import { primitives, semantics } from './tokens';

const primitiveColors = new Set<string>(Object.values(primitives.color));

describe('semantic tokens', () => {
  it.each(Object.entries(semantics.color))(
    '%s resolves to a primitive, not a literal',
    (_role, value) => {
      expect(primitiveColors).toContain(value);
    },
  );

  it('reuse the primitive scales rather than copying them', () => {
    expect(semantics.space).toBe(primitives.space);
    expect(semantics.radius).toBe(primitives.radius);
    expect(semantics.duration).toBe(primitives.duration);
    expect(semantics.easing).toBe(primitives.easing);
  });
});

describe('primitive scales', () => {
  it('keep spacing on a 4pt base', () => {
    for (const value of Object.values(primitives.space)) {
      expect(value % 4).toBe(0);
    }
  });

  it.each(Object.entries(primitives.type))(
    '%s has a line height at least its font size',
    (_name, style) => {
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
    },
  );
});
