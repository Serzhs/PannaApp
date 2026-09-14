/**
 * WCAG 2.2 relative luminance and contrast. Lives beside the tokens rather than in a
 * test so the design gallery can show the same numbers the test enforces - a ratio
 * nobody can see is a ratio nobody checks.
 */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string): number {
  const hex = color.replace('#', '');
  const at = (i: number): number => Number.parseInt(hex.slice(i, i + 2), 16);
  return 0.2126 * channel(at(0)) + 0.7152 * channel(at(2)) + 0.0722 * channel(at(4));
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
