import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.space6,
    gap: theme.space.space3,
    backgroundColor: theme.colors.background,
  },
  message: {
    textAlign: 'center',
  },
});
