import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  card: {
    gap: theme.space.space3,
  },
  head: {
    flexDirection: 'row',
    gap: theme.space.space3,
    alignItems: 'flex-start',
  },
  circle: {
    width: theme.space.space8,
    height: theme.space.space8,
    borderRadius: theme.radius.radiusFull,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleNested: {
    backgroundColor: theme.colors.accentMuted,
  },
  text: {
    flex: 1,
    gap: theme.space.space2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.space2,
  },
  metaIcon: {
    width: theme.space.space4,
  },
  metaText: {
    flex: 1,
  },
  /** The author's tip, set apart on a tinted ground so it reads as an aside. */
  note: {
    padding: theme.space.space3,
    borderRadius: theme.radius.radiusSm,
    backgroundColor: theme.colors.accentMuted,
  },
  /** Small and to one side: reading is not cooking, and the words come first. */
  photo: {
    width: theme.space.space12 * 3,
    height: theme.space.space12 * 2,
    borderRadius: theme.radius.radiusSm,
    backgroundColor: theme.colors.surfaceRaised,
  },
  nested: {
    paddingTop: theme.space.space2,
  },
});
