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
 * The mark is a trademark and must be Google's own file from their branding guidelines.
 * Their four-colour G is not reproduced here: a redrawn mark that is subtly wrong is a
 * branding violation that looks finished, which is worse than an obvious stand-in. So
 * the slot holds a plain letter until the real asset is dropped in, and swapping it is
 * one element.
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
      <View style={styles.logoSlot} accessibilityElementsHidden importantForAccessibility="no">
        <Text style={styles.logoStandIn}>G</Text>
      </View>
      <Text style={styles.label}>Continue with Google</Text>
    </Pressable>
  );
}
