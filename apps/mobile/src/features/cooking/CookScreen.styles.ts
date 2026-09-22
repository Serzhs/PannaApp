import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** A knuckle needs more than the 44 points WCAG asks for; this is the cooking bar. */
const BAR_HEIGHT = 80;

export const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.space3,
    marginBottom: theme.space.space3,
  },
  title: {
    flexShrink: 1,
  },
  bottom: {
    marginTop: theme.space.space6,
    gap: theme.space.space2,
  },
  doneBar: {
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
