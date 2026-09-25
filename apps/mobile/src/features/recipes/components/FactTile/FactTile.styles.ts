import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: theme.space.space1,
    paddingVertical: theme.space.space3,
    paddingHorizontal: theme.space.space2,
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.surfaceRaised,
  },
  icon: {
    width: theme.space.space6,
  },
  pressed: {
    opacity: 0.7,
  },
});
