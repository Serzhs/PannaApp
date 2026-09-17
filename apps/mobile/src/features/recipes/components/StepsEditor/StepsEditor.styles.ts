import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  /** The step's number and its move buttons share the first line; a long label wraps under. */
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.space.space2,
  },
  /** Indented, so the nesting is visible while editing as well as while reading. */
  nested: {
    paddingStart: theme.space.space4,
    borderStartWidth: 2,
    borderStartColor: theme.colors.borderSubtle,
    gap: theme.space.space2,
  },
});
