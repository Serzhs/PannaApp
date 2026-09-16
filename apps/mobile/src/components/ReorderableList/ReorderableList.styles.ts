import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** WCAG 2.2 asks for 44 points, and a drag handle is grabbed with a thumb. */
const MIN_TARGET = 44;

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.space2,
    paddingVertical: theme.space.space2,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  controls: {
    alignItems: 'center',
  },
  handle: {
    minHeight: MIN_TARGET,
    minWidth: MIN_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
