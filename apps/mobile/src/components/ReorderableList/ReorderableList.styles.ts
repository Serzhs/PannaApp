import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** WCAG 2.2 asks for 44 points; the arrows are exactly that and nothing more. */
const TARGET = 44;

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.space2,
    paddingVertical: theme.space.space2,
  },
  content: {
    flex: 1,
  },
  controls: {
    width: TARGET,
    alignItems: 'center',
    gap: theme.space.space1,
  },
  arrow: {
    width: TARGET,
    height: TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.radiusMd,
  },
  arrowPressed: {
    backgroundColor: theme.colors.accentMuted,
  },
});
