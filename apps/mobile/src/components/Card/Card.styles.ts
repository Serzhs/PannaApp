import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  card: {
    padding: theme.space.space4,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.radiusMd,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  pressed: {
    opacity: 0.85,
  },
});
