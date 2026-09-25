import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  /**
   * Wraps, so at the largest text sizes the name drops under the amount instead of the
   * amount breaking mid-word: "600 g" must never read as "60" over "0 g".
   */
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.space3,
    paddingVertical: theme.space.space3,
  },
  divided: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  /** Wide enough for "about 1 cup" at normal sizes; it grows rather than breaks a word. */
  amount: {
    minWidth: theme.space.space16 + theme.space.space6,
    flexShrink: 0,
  },
  /** Takes the rest of the row, or the whole next line when the rest is too little. */
  text: {
    flexGrow: 1,
    flexBasis: theme.space.space16 * 2,
    gap: theme.space.space1,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.space2,
  },
  name: {
    flexShrink: 1,
  },
  tag: {
    paddingHorizontal: theme.space.space2,
    borderRadius: theme.radius.radiusFull,
    backgroundColor: theme.colors.surfaceRaised,
  },
});
