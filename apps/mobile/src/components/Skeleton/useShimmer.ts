import { useEffect } from 'react';
import {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/styles/theme';

/**
 * The highlight colour is the screen background, so at full strength a skeleton lying
 * on the background would vanish once a cycle. The highlight never gets past this.
 */
const PEAK = 0.6;

/**
 * Runs on the UI thread so a screen busy parsing its data cannot make the placeholder
 * stutter, which would look worse than no animation. With reduce motion on the highlight
 * simply stays off: the base colour alone still reads as a placeholder.
 */
export function useShimmer() {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(PEAK, {
        duration: theme.duration.durationDeliberate,
        easing: Easing.bezier(...theme.easing.easeStandard),
      }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [reduced, progress]);

  return useAnimatedStyle(() => ({ opacity: progress.value }));
}
