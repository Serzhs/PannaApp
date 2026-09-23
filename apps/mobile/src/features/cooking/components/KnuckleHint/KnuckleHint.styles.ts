import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** The same depth as the cooking bar: the hint's button is the thing it teaches. */
const BAR_HEIGHT = 80;
/** How far the fist travels to reach the bar. */
export const DROP = theme.space.space6;

export const styles = StyleSheet.create({
  body: {
    paddingVertical: theme.space.space4,
  },
  picture: {
    alignItems: 'center',
    gap: theme.space.space6,
    paddingTop: theme.space.space4,
  },
  fist: {
    alignItems: 'center',
  },
  knuckles: {
    flexDirection: 'row',
    gap: theme.space.space1,
    // The knuckles sit on the palm's top edge, so the row overlaps it by a little.
    marginBottom: -theme.space.space2,
    zIndex: 1,
  },
  knuckle: {
    width: theme.space.space4,
    height: theme.space.space4,
    borderRadius: theme.radius.radiusFull,
    backgroundColor: theme.colors.textSecondary,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  palm: {
    width: theme.space.space12,
    height: theme.space.space8,
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.textSecondary,
  },
  bar: {
    width: '70%',
    height: BAR_HEIGHT,
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.accent,
  },
  gotIt: {
    minHeight: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.accent,
  },
  gotItPressed: {
    opacity: 0.85,
  },
});
