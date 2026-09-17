import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { theme } from '@/styles/theme';

/** The chip is drawn short; the slop makes the target the 44 points WCAG 2.2 asks for. */
const MIN_TARGET = 44;
const HEIGHT = 32;

export const styles = StyleSheet.create({
  base: {
    minHeight: HEIGHT,
    paddingHorizontal: theme.space.space3,
    paddingVertical: theme.space.space1,
    borderRadius: theme.radius.radiusFull,
    borderWidth: 1,
    justifyContent: 'center',
  },
  hitSlop: {
    top: (MIN_TARGET - HEIGHT) / 2,
    bottom: (MIN_TARGET - HEIGHT) / 2,
  },
});

export function chipStyle(selected: boolean, disabled: boolean, pressed: boolean): ViewStyle {
  return {
    backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
    borderColor: disabled
      ? theme.colors.borderSubtle
      : selected
        ? theme.colors.accent
        : theme.colors.border,
    opacity: pressed && !disabled ? 0.85 : 1,
  };
}

export function labelStyle(selected: boolean, disabled: boolean): TextStyle {
  return {
    color: disabled
      ? theme.colors.textDisabled
      : selected
        ? theme.colors.onAccent
        : theme.colors.textPrimary,
  };
}
