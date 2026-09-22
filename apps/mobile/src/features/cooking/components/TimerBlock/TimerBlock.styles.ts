import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** A knuckle needs more than the 44 points WCAG asks for; this is the cooking bar. */
const BAR_HEIGHT = 80;

export const styles = StyleSheet.create({
  bar: {
    minHeight: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.radiusMd,
    paddingHorizontal: theme.space.space4,
  },
  start: {
    backgroundColor: theme.colors.accent,
  },
  stop: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  done: {
    backgroundColor: theme.colors.accentMuted,
  },
  running: {
    gap: theme.space.space3,
    alignItems: 'center',
  },
  note: {
    gap: theme.space.space2,
    paddingVertical: theme.space.space2,
  },
  link: {
    minHeight: BAR_HEIGHT / 2,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
