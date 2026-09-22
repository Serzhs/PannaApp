import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** The same sizes as the guide: rows a knuckle can hit, a bar it cannot miss. */
const ROW_HEIGHT = 64;
const BAR_HEIGHT = 80;

export const styles = StyleSheet.create({
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.space3,
    paddingHorizontal: theme.space.space4,
    paddingVertical: theme.space.space2,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.radiusMd,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  rowWithout: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
  },
  rowText: {
    flex: 1,
  },
  startBar: {
    minHeight: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.accent,
  },
  pressed: {
    opacity: 0.85,
  },
});
