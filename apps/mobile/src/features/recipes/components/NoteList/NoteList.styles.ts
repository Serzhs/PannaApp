import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  /** Edged like the meanwhile block: the cook's words, set apart from the author's. */
  note: {
    gap: theme.space.space0,
    paddingStart: theme.space.space3,
    borderStartWidth: 2,
    borderStartColor: theme.colors.accentMuted,
  },
});
