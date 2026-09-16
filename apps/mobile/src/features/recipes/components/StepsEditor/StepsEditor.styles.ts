import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  /** Indented, so the nesting is visible while editing as well as while reading. */
  nested: {
    paddingStart: theme.space.space4,
    borderStartWidth: 2,
    borderStartColor: theme.colors.borderSubtle,
    gap: theme.space.space2,
  },
});
