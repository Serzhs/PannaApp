import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  /** Indented under its main step, the way the recipe screen shows "meanwhile". */
  parallel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.space2,
    marginStart: theme.space.space4,
    paddingStart: theme.space.space3,
    borderStartWidth: 2,
    borderStartColor: theme.colors.borderSubtle,
  },
  parallelTitle: {
    flex: 1,
  },
  add: {
    alignSelf: 'flex-start',
  },
});
