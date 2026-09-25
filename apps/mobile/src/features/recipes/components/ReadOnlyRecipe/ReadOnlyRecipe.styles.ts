import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  body: {
    paddingVertical: theme.space.space4,
  },
  facts: {
    flexDirection: 'row',
    gap: theme.space.space2,
  },
  cover: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.radiusLg,
    backgroundColor: theme.colors.surfaceRaised,
  },
});
