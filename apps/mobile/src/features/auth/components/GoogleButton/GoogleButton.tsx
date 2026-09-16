import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { PROVIDER_BUTTON } from '../providerButton';

import { styles } from './GoogleButton.styles';
import { GoogleLogo } from './GoogleLogo';

export interface GoogleButtonProps {
  readonly onPress: () => void;
  readonly disabled?: boolean;
}

/**
 * Google requires its own button: their mark, their colours, their type. It is
 * therefore built from raw values rather than design tokens, and renders React Native's
 * own Text rather than the app's - the app's Text carries semantic colours by design,
 * and this label's colour is Google's to choose.
 */
export function GoogleButton({ onPress, disabled = false }: GoogleButtonProps) {
  const { t } = useTranslation();
  const label = t('auth:continueWithGoogle');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && !disabled ? styles.pressed : null]}
    >
      <View style={styles.logo}>
        <GoogleLogo size={PROVIDER_BUTTON.logo} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
