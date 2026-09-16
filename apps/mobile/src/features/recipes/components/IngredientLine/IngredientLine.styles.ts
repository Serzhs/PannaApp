import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  amountRow: {
    flexDirection: 'row',
    gap: theme.space.space3,
    alignItems: 'flex-start',
  },
  amount: {
    flex: 1,
  },
  unit: {
    flex: 1,
  },
});
