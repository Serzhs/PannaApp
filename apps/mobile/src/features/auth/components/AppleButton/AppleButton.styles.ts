import { StyleSheet } from 'react-native';

import { PROVIDER_BUTTON } from '../providerButton';

import { theme } from '@/styles/theme';

/**
 * Apple's branding rules, not the design system: they specify the colours and the type.
 * This is one of the two places CLAUDE.md says the app's own styling does not win. The
 * height, radius and logo size come from PROVIDER_BUTTON so the two providers match.
 */
export const APPLE_BRAND = {
  surface: '#000000',
  label: '#FFFFFF',
} as const;

export const styles = StyleSheet.create({
  button: {
    height: PROVIDER_BUTTON.height,
    borderRadius: PROVIDER_BUTTON.radius,
    backgroundColor: APPLE_BRAND.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.space3,
  },
  label: {
    color: APPLE_BRAND.label,
    fontSize: 16,
    fontWeight: '500',
  },
  // Pinned to the edge rather than flowing beside the label, so the two providers' marks
  // sit at the same point whatever their labels measure.
  logo: {
    position: 'absolute',
    start: theme.space.space4,
    color: APPLE_BRAND.label,
    // A glyph's ink is about four fifths of its font size, so the logo is set larger
    // than Google's mark to draw at the same height, and nudged up to sit level with it.
    fontSize: PROVIDER_BUTTON.logo * 1.25,
    marginTop: -3,
  },
  pressed: {
    opacity: 0.85,
  },
});
