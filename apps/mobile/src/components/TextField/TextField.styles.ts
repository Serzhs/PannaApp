import { StyleSheet, type TextStyle } from 'react-native';

import { theme } from '@/styles/theme';

/** WCAG 2.2 asks for 44 points, and a field is easier to miss than a button. */
const MIN_TARGET = 44;

export const styles = StyleSheet.create({
  input: {
    ...theme.text.body,
    minHeight: MIN_TARGET,
    paddingHorizontal: theme.space.space3,
    paddingVertical: theme.space.space2,
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
  },
});

export function inputStyle(invalid: boolean, focused: boolean): TextStyle {
  return {
    // The thicker border is a second, non-colour signal that the field is focused or
    // wrong, which is what CLAUDE.md's "never colour alone" rule asks for.
    borderWidth: focused || invalid ? 2 : 1,
    borderColor: invalid
      ? theme.colors.danger
      : focused
        ? theme.colors.borderFocus
        : theme.colors.border,
  };
}
