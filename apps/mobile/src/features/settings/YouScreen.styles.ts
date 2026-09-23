import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.space3,
  },
  email: {
    flexShrink: 1,
  },
  body: {
    paddingVertical: theme.space.space4,
  },
});
