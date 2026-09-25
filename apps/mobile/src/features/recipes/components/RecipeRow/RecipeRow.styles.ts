import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  text: {
    flex: 1,
  },
  cover: {
    width: theme.space.space16,
    height: theme.space.space16,
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.surfaceRaised,
  },
  /** At the largest font sizes the chips drop under the title rather than squeezing it. */
  titleRow: {
    flexWrap: 'wrap',
  },
  title: {
    flexShrink: 1,
  },
  /** Text in a border, never a colour alone: "Draft" is read, not inferred. */
  chip: {
    paddingHorizontal: theme.space.space2,
    borderRadius: theme.radius.radiusFull,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  newChip: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentMuted,
  },
});
