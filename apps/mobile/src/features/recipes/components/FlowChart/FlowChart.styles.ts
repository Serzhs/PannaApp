import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

const LINE = 2;

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  main: {
    flex: 1,
    alignItems: 'stretch',
  },
  box: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.space.space3,
    paddingVertical: theme.space.space2,
    gap: theme.space.space0,
  },
  /** The spine between one main step and the next. */
  line: {
    alignSelf: 'center',
    width: LINE,
    height: theme.space.space5,
    backgroundColor: theme.colors.border,
  },
  branch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    // Level with the middle of the main box's first line, where the branch leaves it.
    paddingTop: theme.space.space5,
  },
  connector: {
    width: theme.space.space4,
    height: LINE,
    backgroundColor: theme.colors.border,
  },
  side: {
    flex: 1,
    borderStartWidth: LINE,
    borderStartColor: theme.colors.border,
    paddingStart: theme.space.space2,
  },
  sideBox: {
    backgroundColor: theme.colors.surfaceRaised,
  },
});
