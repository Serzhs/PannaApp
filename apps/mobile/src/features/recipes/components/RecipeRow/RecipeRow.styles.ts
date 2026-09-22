import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
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
  },
});
