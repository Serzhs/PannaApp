import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  step: {
    paddingVertical: theme.space.space2,
    gap: theme.space.space1,
  },
  /** Indented and edged, so "during the step above" is visible as well as labelled. */
  meanwhile: {
    marginStart: theme.space.space4,
    paddingStart: theme.space.space3,
    borderStartWidth: 2,
    borderStartColor: theme.colors.borderSubtle,
  },
  nested: {},
  /** Small and to one side: reading is not cooking, and the words come first. */
  photo: {
    width: theme.space.space12 * 3,
    height: theme.space.space12 * 2,
    borderRadius: theme.radius.radiusSm,
    backgroundColor: theme.colors.surfaceRaised,
    marginTop: theme.space.space1,
  },
});
