import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  body: {
    paddingVertical: theme.space.space4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.space3,
    paddingVertical: theme.space.space2,
  },
  switchLabel: {
    flex: 1,
  },
});
