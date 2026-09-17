import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** WCAG 2.2 asks for 44 points, and a row is the whole target. */
const MIN_TARGET = 44;

export const styles = StyleSheet.create({
  sheet: {
    paddingVertical: theme.space.space6,
  },
  row: {
    minHeight: MIN_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.space3,
    paddingHorizontal: theme.space.space2,
    borderRadius: theme.radius.radiusMd,
  },
  rowPressed: {
    backgroundColor: theme.colors.accentMuted,
  },
  rowTitle: {
    flex: 1,
  },
});
