import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** WCAG 2.2 asks for 44 points, and a settings row is a target like any other. */
const MIN_TARGET = 44;

export const styles = StyleSheet.create({
  group: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.radiusMd,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    overflow: 'hidden',
  },
  row: {
    minHeight: MIN_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.space4,
    paddingVertical: theme.space.space3,
  },
  rowLabel: {
    flexShrink: 1,
  },
  pressed: {
    backgroundColor: theme.colors.surfaceRaised,
  },
});
