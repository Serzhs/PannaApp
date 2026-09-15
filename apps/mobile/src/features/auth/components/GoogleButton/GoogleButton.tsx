import { Pressable, Text, View } from 'react-native';

import { styles } from './GoogleButton.styles';

export interface GoogleButtonProps {
  readonly onPress: () => void;
  readonly disabled?: boolean;
}

/**
 * Google requires its own button: their mark, their wordmark, their colours. It is
 * therefore built from raw values rather than design tokens, and renders React Native's
 * own Text rather than the app's - the app's Text carries semantic colours by design,
 * and this label's colour is Google's to choose.
 *
 * The mark is a trademark and must be Google's own file from their branding guidelines,
 * never a redrawing. Until that asset is added the slot below is deliberately blank
 * rather than approximated, because an approximated mark is a branding violation that
 * looks finished.
 */
export function GoogleButton({ onPress, disabled = false }: GoogleButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && !disabled ? styles.pressed : null]}
    >
      <View style={styles.logoSlot} accessibilityElementsHidden importantForAccessibility="no" />
      <Text style={styles.label}>Continue with Google</Text>
    </Pressable>
  );
}
