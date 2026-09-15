import { StyleSheet } from 'react-native';

import { PROVIDER_BUTTON } from '../providerButton';

import { theme } from '@/styles/theme';

/**
 * Google's branding rules, not the design system: the border colour, the surface, the
 * label colour and the type are theirs to specify. This is one of the two places
 * CLAUDE.md says the app's own styling does not win. The height and radius come from
 * PROVIDER_BUTTON, which sits inside the range Google allow.
 */
export const GOOGLE_BRAND = {
  border: '#747775',
  surface: '#FFFFFF',
  label: '#1F1F1F',
  logo: 20,
} as const;

export const styles = StyleSheet.create({
  button: {
    height: PROVIDER_BUTTON.height,
    borderRadius: PROVIDER_BUTTON.radius,
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
    fontSize: 16,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.85,
  },
});
