import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  text: {
    flex: 1,
  },
  cover: {
    width: theme.space.space12,
    height: theme.space.space12,
    borderRadius: theme.radius.radiusSm,
    backgroundColor: theme.colors.surfaceRaised,
  },
});
