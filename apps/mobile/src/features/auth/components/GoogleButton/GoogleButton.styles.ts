import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/**
 * Google's branding rules, not the design system: the height, the border colour, the
 * radius and the type are theirs to specify. This is one of the two places CLAUDE.md
 * says the app's own styling does not win.
 */
export const GOOGLE_BRAND = {
  height: 40,
  radius: 4,
  border: '#747775',
  surface: '#FFFFFF',
  label: '#1F1F1F',
  logo: 20,
  /** Google Blue, used only for the stand-in letter below. */
  standIn: '#4285F4',
} as const;

export const styles = StyleSheet.create({
  button: {
    height: GOOGLE_BRAND.height,
    borderRadius: GOOGLE_BRAND.radius,
    borderWidth: 1,
    borderColor: GOOGLE_BRAND.border,
    backgroundColor: GOOGLE_BRAND.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.space3,
    paddingHorizontal: theme.space.space3,
  },
  label: {
    color: GOOGLE_BRAND.label,
    fontSize: 14,
    fontWeight: '500',
  },
  /** Holds the space Google's mark occupies, so dropping in the asset changes nothing else. */
  logoSlot: {
    width: GOOGLE_BRAND.logo,
    height: GOOGLE_BRAND.logo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** A stand-in letter, not Google's mark. Replaced by their file, never redrawn. */
  logoStandIn: {
    fontSize: 18,
    fontWeight: '700',
    color: GOOGLE_BRAND.standIn,
  },
  pressed: {
    opacity: 0.85,
  },
});
