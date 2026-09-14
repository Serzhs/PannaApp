import { View, type ViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from './Screen.styles';

export interface ScreenProps extends ViewProps {
  readonly scroll?: boolean;
  readonly padded?: boolean;
}

/**
 * Safe areas are handled here and nowhere else, so a new screen cannot forget the notch
 * or the home indicator. The bottom edge is included: without it, content on a phone
 * with a home indicator sits underneath it and the last row is half unreachable.
 *
 * Keyboard avoidance is handled here too, for the same reason - per CLAUDE.md no screen
 * writes its own, so the field being typed into is never behind the keyboard.
 */
export function Screen({
  scroll = false,
  padded = true,
  children,
  style,
  ...rest
}: ScreenProps): React.JSX.Element {
  const padding = padded ? styles.padded : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      {scroll ? (
        <KeyboardAwareScrollView
          contentContainerStyle={[styles.scrollContent, padding]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={styles.keyboardOffset.marginBottom}
        >
          <View {...rest} style={style}>
            {children}
          </View>
        </KeyboardAwareScrollView>
      ) : (
        <View {...rest} style={[styles.content, padding, style]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
