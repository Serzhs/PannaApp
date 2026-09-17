import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** WCAG 2.2 asks for 44 points, and a tab is tapped on the way somewhere else. */
const MIN_TARGET = 44;
const UNDERLINE = 2;

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  tab: {
    flex: 1,
    minHeight: MIN_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.space2,
    borderBottomWidth: UNDERLINE,
    borderBottomColor: 'transparent',
  },
  tabSelected: {
    borderBottomColor: theme.colors.accent,
  },
  tabPressed: {
    backgroundColor: theme.colors.accentMuted,
  },
});
