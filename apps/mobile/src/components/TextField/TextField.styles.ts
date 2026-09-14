import { StyleSheet, type TextStyle } from 'react-native';

import { theme } from '@/styles/theme';

/** WCAG 2.2 asks for 44 points, and a field is easier to miss than a button. */
const MIN_TARGET = 44;

/**
 * A TextInput must not take the token's `lineHeight`. iOS applies it to the input's
 * internal text container and the text then sits off-centre in the box; the symmetric
 * padding below is what centres it instead.
 */
const bodyText = { fontSize: theme.text.body.fontSize, fontWeight: theme.text.body.fontWeight };

export const styles = StyleSheet.create({
  input: {
    ...bodyText,
    minHeight: MIN_TARGET,
    paddingHorizontal: theme.space.space3,
    paddingVertical: theme.space.space3,
    borderRadius: theme.radius.radiusMd,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    // Constant so the field cannot change height between states. A border that grows on
    // focus shifts every field below it, and in a list of fields it reads as a jump.
    borderWidth: 1,
  },
});

/**
 * Only the colour changes. The non-colour signal for an error is the message under the
 * field, which is what CLAUDE.md's "never colour alone" rule asks for and what the test
 * asserts - the border does not have to carry it too.
 */
export function inputStyle(invalid: boolean, focused: boolean): TextStyle {
  return {
    borderColor: invalid
      ? theme.colors.danger
      : focused
        ? theme.colors.borderFocus
        : theme.colors.border,
  };
}
