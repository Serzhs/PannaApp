import type { TextStyle } from 'react-native';

import { semantics, primitives } from './tokens';

const { type, weight } = primitives;

/**
 * A named style is a size, a line height and a weight together. Splitting them lets a
 * caller pair 32pt type with a 16pt line height, which is the bug this prevents.
 */
export const textStyles = {
  display: { ...type.text32, fontWeight: weight.weightSemibold },
  title: { ...type.text24, fontWeight: weight.weightSemibold },
  heading: { ...type.text20, fontWeight: weight.weightSemibold },
  body: { ...type.text16, fontWeight: weight.weightRegular },
  bodyStrong: { ...type.text16, fontWeight: weight.weightMedium },
  caption: { ...type.text14, fontWeight: weight.weightRegular },
  label: { ...type.text14, fontWeight: weight.weightMedium },
} as const satisfies Record<string, TextStyle>;

export type TextStyleName = keyof typeof textStyles;

/**
 * The one sanctioned cap on font scaling (CLAUDE.md, Accessibility): for a layout that
 * genuinely cannot stretch, such as the native navigation header, whose height iOS fixes.
 * Every use is a design bug with a deadline, not a solution, and names this constant so
 * they can all be found.
 */
export const FIXED_LAYOUT_MAX_FONT_SCALE = 1.6;

/**
 * One theme, imported directly rather than passed through a provider. A provider only
 * earns its keep when a second theme can be switched to at runtime, and dark mode is
 * out of scope for 0002. Swapping to one later changes this module and nothing else,
 * because components already name roles rather than values.
 */
export const theme = {
  colors: semantics.color,
  space: semantics.space,
  radius: semantics.radius,
  duration: semantics.duration,
  easing: semantics.easing,
  spring: semantics.spring,
  text: textStyles,
} as const;

export type AppTheme = typeof theme;
