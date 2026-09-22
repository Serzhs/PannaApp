import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** A row a knuckle can hit without looking: well past the 44-point minimum. */
const ROW_HEIGHT = 64;
const BAR_HEIGHT = 80;

export const styles = StyleSheet.create({
  card: {
    gap: theme.space.space3,
    padding: theme.space.space5,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.radiusMd,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  photoBar: {
    minHeight: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.radiusMd,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surface,
  },
  meanwhile: {
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
  meanwhileDone: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentMuted,
  },
  meanwhileText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
