import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

const BAR_HEIGHT = 80;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.textPrimary,
  },
  image: {
    flex: 1,
  },
  close: {
    minHeight: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingBottom: theme.space.space6,
  },
  pressed: {
    opacity: 0.85,
  },
});
