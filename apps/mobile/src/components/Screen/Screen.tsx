// Expo Router carries its own copy of the tabs code and refuses the separate package;
// this is the one path it exposes the context on.
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';
import { useContext } from 'react';
import { View, type ViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from './Screen.styles';

export interface ScreenProps extends ViewProps {
  readonly scroll?: boolean;
  readonly padded?: boolean;
  /** A navigation header sits above this screen and already covers the top inset. */
  readonly withHeader?: boolean;
  /** Pinned under the body, above the home indicator: the one action a screen must never hide (0029). */
  readonly footer?: React.ReactNode;
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
  withHeader = false,
  footer,
  children,
  style,
  ...rest
}: ScreenProps): React.JSX.Element {
  const padding = padded ? styles.padded : undefined;
  // Inside the tabs (0018) the bar already covers the home indicator; a second bottom
  // inset would leave a gap under a pinned footer. Outside them the inset is ours to take.
  const underTabBar = useContext(BottomTabBarHeightContext) !== undefined;
  // Taking the top inset twice leaves a visible gap under the header.
  const edges = [
    ...(withHeader ? [] : ['top' as const]),
    ...(underTabBar ? [] : ['bottom' as const]),
    'left' as const,
    'right' as const,
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
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
      {footer === undefined || footer === null ? null : (
        <View style={[styles.footer, padding]}>{footer}</View>
      )}
    </SafeAreaView>
  );
}
