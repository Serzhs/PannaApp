import { contrast } from './contrast';
import { semantics } from './tokens';

const { color } = semantics;

/**
 * Pairs that actually occur, not every combination. A ratio nobody renders is a test
 * that fails for a reason nobody has to fix.
 */
const bodyText = [
  ['textPrimary on background', color.textPrimary, color.background],
  ['textPrimary on surface', color.textPrimary, color.surface],
  ['textSecondary on background', color.textSecondary, color.background],
  ['textSecondary on surface', color.textSecondary, color.surface],
  ['textInverse on accent', color.textInverse, color.accent],
  ['onAccent on accent', color.onAccent, color.accent],
  ['onDanger on danger', color.onDanger, color.danger],
  ['accent on surface', color.accent, color.surface],
  ['accent on background', color.accent, color.background],
  ['danger on surface', color.danger, color.surface],
  ['danger on background', color.danger, color.background],
  ['success on surface', color.success, color.surface],
  ['warning on surface', color.warning, color.surface],
] as const;

const boundaries = [
  ['border on surface', color.border, color.surface],
  ['border on background', color.border, color.background],
  ['borderFocus on surface', color.borderFocus, color.surface],
  ['borderFocus on background', color.borderFocus, color.background],
] as const;

describe('contrast', () => {
  it.each(bodyText)('%s clears 4.5:1', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(boundaries)('%s clears 3:1', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });

  /**
   * WCAG 1.4.3 and 1.4.11 both exempt disabled controls and purely decorative
   * surfaces, so these are named here rather than left to be discovered as failures.
   */
  it('exempts only disabled text and decorative surfaces', () => {
    expect(contrast(color.textDisabled, color.surface)).toBeLessThan(4.5);
    expect(contrast(color.borderSubtle, color.surface)).toBeLessThan(3);
  });
});
