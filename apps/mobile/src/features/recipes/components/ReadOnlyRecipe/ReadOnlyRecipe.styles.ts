import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  body: {
    paddingVertical: theme.space.space4,
  },
  cover: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.surfaceRaised,
  },
});
