import * as AppleAuthentication from 'expo-apple-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Pressable, Text } from 'react-native';

import { PROVIDER_BUTTON } from '../providerButton';

import { styles } from './AppleButton.styles';

/**
 * Expo Go ships no expo-apple-authentication at all - it was dropped from the iOS
 * client during the React Native 0.86 autolinking change, and the fix is merged
 * upstream but not in any Expo Go build available for SDK 57. Rendering Apple's own
 * component there produces a red "unimplemented component" box.
 */
const NATIVE_BUTTON_AVAILABLE = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** U+F8FF is the Apple logo in the system font on Apple platforms, so this is their
 * own glyph rather than a redrawing of the mark. It renders as a blank box elsewhere,
 * which is why this component is only used on iOS. */
const APPLE_LOGO = '';

export interface AppleButtonProps {
  readonly onPress: () => void;
  readonly disabled?: boolean;
}

export function AppleButton({ onPress, disabled = false }: AppleButtonProps) {
  if (NATIVE_BUTTON_AVAILABLE) {
    return (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={PROVIDER_BUTTON.radius}
        style={styles.button}
        onPress={onPress}
      />
    );
  }

  // Built to Apple's specification so the screen can be looked at in Expo Go. The real
  // component takes over anywhere it exists, which is everywhere that matters.
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
