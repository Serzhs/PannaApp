import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { styles } from './TimerBlock.styles';

import { Text } from '@/components/Text';
import { formatDuration } from '@/features/recipes/format';

export type TimerState =
  | { readonly kind: 'idle'; readonly seconds: number }
  | { readonly kind: 'running'; readonly endsAt: number; readonly silent: boolean }
  | { readonly kind: 'elsewhere'; readonly stepNumber: number; readonly endsAt: number }
  | { readonly kind: 'done' };

export interface TimerBlockProps {
  readonly state: TimerState;
  readonly onStart: () => void;
  readonly onStop: () => void;
  /** Fired once when a running timer reaches its end. */
  readonly onEnded: () => void;
  readonly now?: () => number;
}

/** A knuckle needs more than the 44 points WCAG asks for; this is the cooking bar. */
const BAR_HEIGHT = 80;

/** Ticks once a second; the count itself is always derived from the end time, never stored. */
function useTick(active: boolean, now: () => number): number {
  const [tick, setTick] = useState(() => now());
  useEffect(() => {
    if (!active) return;
    setTick(now());
    const handle = setInterval(() => {
      setTick(now());
    }, 1000);
    return () => {
      clearInterval(handle);
    };
  }, [active, now]);
  return tick;
}

/**
 * One timer at a time (0012): the block shows this step's, or says whose is running.
 * The count is derived from the end time, so a minute away from the screen costs nothing.
 */
export function TimerBlock({
  state,
  onStart,
  onStop,
  onEnded,
  now = Date.now,
}: TimerBlockProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const endsAt = state.kind === 'running' || state.kind === 'elsewhere' ? state.endsAt : null;
  const tick = useTick(endsAt !== null, now);
  const remaining =
    endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - Math.max(tick, 0)) / 1000));

  useEffect(() => {
    // Checked against the clock itself, so a stale tick can never end a timer early.
    if (state.kind === 'running' && state.endsAt <= now()) onEnded();
  }, [state, tick, now, onEnded]);

  const two = new Intl.NumberFormat(i18n.language, { minimumIntegerDigits: 2 });
  const clock = t('recipes:cook.remaining', {
    minutes: two.format(Math.floor(remaining / 60)),
    seconds: two.format(remaining % 60),
  });

  if (state.kind === 'idle') {
    const label = t('recipes:cook.startTimer', { time: formatDuration(state.seconds, t) });
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onStart}
        style={({ pressed }) => [styles.bar, styles.start, pressed ? styles.pressed : null]}
      >
        <Text variant="title" color="onAccent">
          {label}
        </Text>
      </Pressable>
    );
  }

  if (state.kind === 'elsewhere') {
    return (
      <View style={styles.note} accessible accessibilityLiveRegion="polite">
        <Text variant="body" color="textSecondary">
          {t('recipes:cook.timerElsewhere', { number: state.stepNumber, time: clock })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('recipes:cook.startTimerAnyway')}
          onPress={onStart}
          style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}
        >
          <Text variant="bodyStrong" color="accent">
            {t('recipes:cook.startTimerAnyway')}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (state.kind === 'done') {
    return (
      <View style={[styles.bar, styles.done]} accessible accessibilityLiveRegion="assertive">
        <Text variant="title">{t('recipes:cook.timeUp')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.running}>
      <Text variant="display" accessibilityLiveRegion="polite" accessibilityLabel={clock}>
        {clock}
      </Text>
      {state.silent ? (
        <Text variant="caption" color="textSecondary">
          {t('recipes:cook.notificationsOff')}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('recipes:cook.stopTimer')}
        onPress={onStop}
        style={({ pressed }) => [styles.bar, styles.stop, pressed ? styles.pressed : null]}
      >
        <Text variant="title" color="accent">
          {t('recipes:cook.stopTimer')}
        </Text>
      </Pressable>
    </View>
  );
}

export { BAR_HEIGHT };
