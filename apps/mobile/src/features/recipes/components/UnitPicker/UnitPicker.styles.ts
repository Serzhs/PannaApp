import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

/** The same box as a TextField, so the row reads as one line of fields. */
const MIN_TARGET = 44;

export const styles = StyleSheet.create({
  field: {
    minHeight: MIN_TARGET,
    justifyContent: 'center',
    paddingHorizontal: theme.space.space3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.surface,
    marginTop: theme.space.space1,
  },
  sheet: {
    paddingVertical: theme.space.space6,
  },
});
