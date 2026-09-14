import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from './Screen.styles';

export interface ScreenProps extends ViewProps {
  readonly scroll?: boolean;
  readonly padded?: boolean;
}

/**
 * Safe areas are handled here and nowhere else, so a new screen cannot forget the
 * notch or the home indicator.
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, padding]}
          keyboardShouldPersistTaps="handled"
        >
          <View {...rest} style={style}>
            {children}
          </View>
        </ScrollView>
      ) : (
        <View {...rest} style={[styles.content, padding, style]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
