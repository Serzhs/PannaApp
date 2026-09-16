import { Pressable, Text } from 'react-native';

import { styles } from './AppleButton.styles';

/** U+F8FF is the Apple logo in the system font on Apple platforms, so this is their
 * own glyph rather than a redrawing of the mark. It renders as a blank box elsewhere,
 * which is why this component is only used on iOS. */
const APPLE_LOGO = '\uF8FF';

export interface AppleButtonProps {
  readonly onPress: () => void;
  readonly disabled?: boolean;
}

/**
 * Built to Apple's specification rather than rendering their native button. Apple allow
 * either, and the native one fixes its own logo size and spacing, which left it visibly
 * smaller and tighter than the Google button beside it. Drawing it here is what lets the
 * two marks sit at the same size with the same gap to their labels.
 */
export function AppleButton({ onPress, disabled = false }: AppleButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && !disabled ? styles.pressed : null]}
    >
      <Text style={styles.logo} accessibilityElementsHidden importantForAccessibility="no">
        {APPLE_LOGO}
      </Text>
      <Text style={styles.label}>Continue with Apple</Text>
    </Pressable>
  );
}
