import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** WCAG 2.2 asks for 44 points; the words are small, the target is not. */
const TARGET = 44;

export const styles = StyleSheet.create({
  row: {
    paddingVertical: theme.space.space2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.space.space2,
  },
  button: {
    minHeight: TARGET,
    paddingHorizontal: theme.space.space2,
    justifyContent: 'center',
    borderRadius: theme.radius.radiusMd,
  },
  buttonPressed: {
    backgroundColor: theme.colors.accentMuted,
  },
});
