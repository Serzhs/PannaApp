import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.space3,
  },
  text: {
    flex: 1,
  },
  thumbnail: {
    width: theme.space.space12,
    height: theme.space.space12,
    borderRadius: theme.radius.radiusSm,
    backgroundColor: theme.colors.surfaceRaised,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.space.space2,
  },
});
