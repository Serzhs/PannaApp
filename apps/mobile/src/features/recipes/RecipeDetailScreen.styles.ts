import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  body: {
    paddingVertical: theme.space.space4,
  },
  cover: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.radiusLg,
    backgroundColor: theme.colors.surfaceRaised,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facts: {
    flexDirection: 'row',
    gap: theme.space.space2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.space2,
  },
  badge: {
    paddingHorizontal: theme.space.space2,
    borderRadius: theme.radius.radiusFull,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
