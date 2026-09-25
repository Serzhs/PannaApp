import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  /** Set in from the number, edged, so "during the step above" is visible as well as labelled. */
  meanwhile: {
    marginStart: theme.space.space10,
    paddingStart: theme.space.space3,
    borderStartWidth: 2,
    borderStartColor: theme.colors.borderSubtle,
    gap: theme.space.space1,
  },
});
