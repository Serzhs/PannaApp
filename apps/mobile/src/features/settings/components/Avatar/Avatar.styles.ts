import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** Wide enough to read a face from across the table, still a circle at any font scale. */
const SIZE = theme.space.space12 * 2;

export const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: theme.colors.surfaceRaised,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
});
