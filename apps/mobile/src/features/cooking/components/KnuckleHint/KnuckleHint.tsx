import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { styles, DROP } from './KnuckleHint.styles';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { theme } from '@/styles/theme';

export interface KnuckleHintProps {
  readonly onDismiss: () => void;
}

/** Drawn from shapes rather than an emoji: a font that lacks the glyph would show a box. */
const KNUCKLES = [0, 1, 2, 3];
/** Three taps, then rest on the bar: enough to show the motion, not a loop to sit through. */
const TAPS = 3;
/** The bar at rest is dimmer than the bar being tapped, so the tap reads without colour change. */
const BAR_REST_OPACITY = 0.55;

/**
 * The once-only hint (0028): cook mode is meant for knuckles. The picture runs on the UI
 * thread and is hidden from the accessibility tree; the words carry the whole message, so
 * with reduce motion on the fist simply rests on the lit bar and nothing else changes.
 */
export function KnuckleHint({ onDismiss }: KnuckleHintProps): React.JSX.Element {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  // 0 is the fist lifted, 1 is the fist on the bar.
  const pressed = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      pressed.value = 1;
      return;
    }
    const down = withTiming(1, {
      duration: theme.duration.durationSlow,
      easing: Easing.bezier(...theme.easing.easeAccelerate),
    });
    const up = withTiming(0, {
      duration: theme.duration.durationBase,
      easing: Easing.bezier(...theme.easing.easeDecelerate),
    });
    const rest = withTiming(1, {
      duration: theme.duration.durationSlow,
      easing: Easing.bezier(...theme.easing.easeAccelerate),
    });
    pressed.value = withSequence(withRepeat(withSequence(down, up), TAPS, false), rest);
    return () => {
      cancelAnimation(pressed);
    };
  }, [reduced, pressed]);

  const fist = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * DROP }],
  }));
  const bar = useAnimatedStyle(() => ({
    opacity: BAR_REST_OPACITY + (1 - BAR_REST_OPACITY) * pressed.value,
  }));

  return (
    <Stack gap="space6" style={styles.body}>
      <Stack gap="space2">
        <Text variant="title" accessibilityRole="header">
          {t('recipes:cook.hintTitle')}
        </Text>
        <Text variant="body">{t('recipes:cook.hintBody')}</Text>
      </Stack>
      <View
        style={styles.picture}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID="knuckle-picture"
      >
        <Animated.View style={[styles.fist, fist]}>
          <View style={styles.knuckles}>
            {KNUCKLES.map((knuckle) => (
              <View key={knuckle} style={styles.knuckle} />
            ))}
          </View>
          <View style={styles.palm} />
        </Animated.View>
        <Animated.View style={[styles.bar, bar]} />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onDismiss}
        style={({ pressed: isPressed }) => [styles.gotIt, isPressed ? styles.gotItPressed : null]}
      >
        <Text variant="title" color="onAccent">
          {t('recipes:cook.hintGotIt')}
        </Text>
      </Pressable>
    </Stack>
  );
}
