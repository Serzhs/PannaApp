import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

const BAR_HEIGHT = 80;

export const styles = StyleSheet.create({
  sheet: {
    paddingVertical: theme.space.space6,
  },
  bar: {
    minHeight: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.radiusMd,
  },
  primary: {
    backgroundColor: theme.colors.accent,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
