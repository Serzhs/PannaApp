/**
 * The only file in `apps/mobile/src` allowed to contain a hex colour, a spacing
 * number, a radius, a font size or a duration. A test fails the build if a semantic
 * token below resolves to anything but one of these primitives.
 */

const space = {
  space0: 0,
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  space8: 32,
  space10: 40,
  space12: 48,
  space16: 64,
} as const;

const radius = {
  radiusNone: 0,
  radiusSm: 4,
  radiusMd: 8,
  radiusLg: 16,
  radiusFull: 9999,
} as const;

/**
 * A warm neutral rather than a blue-grey, because every screen in this app sits
 * behind photographs of food. `neutral500` is picked to clear 3:1 against both
 * `neutral0` and `neutral100`, since it is the colour control boundaries use.
 */
const color = {
  neutral0: '#FFFFFF',
  neutral50: '#FAFAF9',
  neutral100: '#F5F5F4',
  neutral200: '#E7E5E4',
  neutral300: '#D6D3D1',
  neutral400: '#A8A29E',
  neutral500: '#918A84',
  neutral600: '#78716C',
  neutral700: '#57534E',
  neutral800: '#292524',
  neutral900: '#1C1917',

  // Placeholder until a brand colour is chosen. Deliberately dark enough to pass
  // 4.5:1 as text on a light surface and to carry white text as a fill, so the
  // component set does not have to change when a real accent replaces it.
  accent100: '#EAF0F5',
  accent300: '#9DB4C7',
  accent500: '#4A6D8C',
  accent700: '#2F4759',

  red100: '#FDECEA',
  red600: '#B03027',
  red700: '#8F241D',

  green100: '#E7F3EE',
  green600: '#24654A',

  amber100: '#FBF1E0',
  amber700: '#7A4F0C',

  scrim: 'rgba(28, 25, 23, 0.6)',
} as const;

/** Size and line height travel together so the two cannot drift apart. */
const type = {
  text12: { fontSize: 12, lineHeight: 16 },
  text14: { fontSize: 14, lineHeight: 20 },
  text16: { fontSize: 16, lineHeight: 24 },
  text18: { fontSize: 18, lineHeight: 26 },
  text20: { fontSize: 20, lineHeight: 28 },
  text24: { fontSize: 24, lineHeight: 32 },
  text32: { fontSize: 32, lineHeight: 40 },
} as const;

const weight = {
  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
} as const;

const duration = {
  durationInstant: 0,
  durationFast: 120,
  durationBase: 200,
  durationSlow: 320,
  durationDeliberate: 480,
} as const;

/**
 * Cubic bezier control points rather than `Easing` calls, so this module stays plain
 * data and can be read by a test without pulling in React Native.
 */
const easing = {
  easeStandard: [0.2, 0, 0, 1],
  easeDecelerate: [0, 0, 0, 1],
  easeAccelerate: [0.3, 0, 1, 1],
} as const;

/** Anything the finger drags or presses, where a fixed duration feels detached. */
const spring = {
  springPress: { damping: 18, stiffness: 240, mass: 1 },
} as const;

export const primitives = {
  space,
  radius,
  color,
  type,
  weight,
  duration,
  easing,
  spring,
} as const;

/**
 * Roles, not values. Every entry is a reference into `primitives` above, never a
 * literal, which is what makes a palette change one edit rather than a sweep.
 */
export const semantics = {
  color: {
    background: color.neutral100,
    surface: color.neutral0,
    surfaceRaised: color.neutral50,
    overlay: color.scrim,

    textPrimary: color.neutral900,
    textSecondary: color.neutral700,
    textDisabled: color.neutral400,
    textInverse: color.neutral0,

    border: color.neutral500,
    borderSubtle: color.neutral200,
    borderFocus: color.accent500,

    accent: color.accent500,
    accentMuted: color.accent100,
    onAccent: color.neutral0,
    danger: color.red600,
    dangerMuted: color.red100,
    onDanger: color.neutral0,
    success: color.green600,
    warning: color.amber700,

    skeletonBase: color.neutral200,
    skeletonHighlight: color.neutral100,
  },
  space,
  radius,
  duration,
  easing,
  spring,
} as const;

export type SemanticColor = keyof typeof semantics.color;
export type SpaceName = keyof typeof semantics.space;
export type RadiusName = keyof typeof semantics.radius;
