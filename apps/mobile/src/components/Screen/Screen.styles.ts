import { StyleSheet } from 'react-native';

import { theme } from '@/styles/theme';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  padded: {
    paddingHorizontal: theme.space.space4,
  },
  footer: {
    paddingVertical: theme.space.space3,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  /** Breathing room between the focused field and the top of the keyboard. */
  keyboardOffset: {
    marginBottom: theme.space.space4,
  },
});
