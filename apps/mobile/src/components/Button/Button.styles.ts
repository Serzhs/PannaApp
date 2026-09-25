import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import type { ButtonVariant } from './Button';

import { theme } from '@/styles/theme';

/** WCAG 2.2 asks for 44 points, and a knuckle needs every one of them. */
const MIN_TARGET = 44;

export const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TARGET,
    minWidth: MIN_TARGET,
    paddingHorizontal: theme.space.space5,
    paddingVertical: theme.space.space3,
    borderRadius: theme.radius.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    position: 'absolute',
  },
});

function background(variant: ButtonVariant, disabled: boolean): string {
  if (variant === 'ghost') return 'transparent';
  if (disabled) return theme.colors.borderSubtle;
  switch (variant) {
    case 'primary':
      return theme.colors.accent;
    case 'danger':
      return theme.colors.danger;
    case 'secondary':
      return theme.colors.surface;
  }
}

function labelColor(variant: ButtonVariant, disabled: boolean): string {
  if (disabled) return theme.colors.textDisabled;
  switch (variant) {
    case 'primary':
      return theme.colors.onAccent;
    case 'danger':
      return theme.colors.onDanger;
    case 'secondary':
    case 'ghost':
      return theme.colors.accent;
  }
}

export function buttonStyle(
  variant: ButtonVariant,
  pressed: boolean,
  disabled: boolean,
): ViewStyle {
  return {
    borderWidth: variant === 'secondary' ? 1 : 0,
    // A ghost button is text that can be pressed, so its text sits where text sits: at the
    // edge, not indented by a box nobody can see. The 44 point target is kept by minWidth.
    ...(variant === 'ghost' ? { paddingHorizontal: 0 } : {}),
    borderColor: disabled ? theme.colors.borderSubtle : theme.colors.border,
    backgroundColor: background(variant, disabled),
    // One opacity for every variant, so adding a variant cannot forget a pressed colour.
    opacity: pressed && !disabled ? 0.85 : 1,
  };
}

export function labelStyle(variant: ButtonVariant, disabled: boolean, hidden: boolean): TextStyle {
  return {
    color: labelColor(variant, disabled),
    // The label keeps its box while loading, so the button cannot resize mid-press.
    opacity: hidden ? 0 : 1,
  };
}
