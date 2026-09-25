import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** WCAG's 44 points: the visual glyph is smaller, and the target makes up the difference. */
const TARGET = 44;

export const styles = StyleSheet.create({
  target: {
    width: TARGET,
    height: TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    width: theme.space.space6,
  },
  hitSlop: {
    margin: theme.space.space1,
  },
  pressed: {
    opacity: 0.6,
  },
});
