import { StyleSheet } from 'react-native';

import { PROVIDER_BUTTON } from '../providerButton';

/**
 * Apple's branding rules, not the design system: they specify the height, the colours,
 * the corner radius and the type. This is one of the two places CLAUDE.md says the
 * app's own styling does not win.
 */
export const APPLE_BRAND = {
  surface: '#000000',
  label: '#FFFFFF',
  labelSize: 16,
  logoSize: 17,
} as const;

export const styles = StyleSheet.create({
  button: {
    height: PROVIDER_BUTTON.height,
    borderRadius: PROVIDER_BUTTON.radius,
    backgroundColor: APPLE_BRAND.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    color: APPLE_BRAND.label,
    fontSize: APPLE_BRAND.labelSize,
  },
  logo: {
    color: APPLE_BRAND.label,
    fontSize: APPLE_BRAND.logoSize,
    // The glyph sits slightly low against cap height, as it does in Apple's own button.
    marginTop: -2,
  },
  pressed: {
    opacity: 0.85,
  },
});
