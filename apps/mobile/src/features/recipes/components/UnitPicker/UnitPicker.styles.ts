import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.space2,
  },
  sheet: {
    paddingVertical: theme.space.space6,
  },
});
