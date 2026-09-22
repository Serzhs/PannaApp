import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { SlideInRight, useReducedMotion } from 'react-native-reanimated';

import { CheckView } from './components/CheckView';
import { PhotoViewer } from './components/PhotoViewer';
import { StepView } from './components/StepView';
import { TimerBlock, type TimerState } from './components/TimerBlock';
import { styles } from './CookScreen.styles';
import { queueFinishedCook } from './history';
import {
  advance,
  beginCooking,
  clearCook,
  currentStep,
  goBack,
  liveSteps,
  loadCook,
  saveCook,
  setTimer,
  stepIndex,
  toggleDone,
  toggleExcluded,
  useCooks,
  type CookRecord,
} from './store';
import { cancelTimerEnd, scheduleTimerEnd } from './timer';

import { imageUrl } from '@/api/images';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { theme } from '@/styles/theme';

export interface CookScreenProps {
  readonly recipeId: string;
}

const KEEP_AWAKE_TAG = 'cooking';

/**
 * The guide (0012). Reads the record the recipe screen wrote and nothing else, so a
 * connection drop cannot touch it; writes every change back as it happens, so being
 * killed loses nothing.
 */
export function CookScreen({ recipeId }: CookScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const reduced = useReducedMotion();
  const cooks = useCooks();
  const record = cooks.find((cook) => cook.recipe.id === recipeId) ?? null;
  const [leaving, setLeaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [timeUp, setTimeUp] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  // A kitchen has no hand free to keep tapping the screen alive.
  useEffect(() => {
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, []);

  const landOnRecipe = useCallback(() => {
    router.replace({ pathname: '/recipes/[id]', params: { id: recipeId } });
  }, [router, recipeId]);

  useEffect(() => {
    if (record === null) landOnRecipe();
  }, [record, landOnRecipe]);

  const ended = useCallback(() => {
    const current = loadCook(recipeId);
    if (current?.timer === null || current === null) return;
    setTimeUp(current.timer.stepId);
    saveCook(setTimer(current, null));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [recipeId]);

  if (record === null) {
    return <Screen />;
  }
  const withoutNames = record.recipe.ingredients
    .filter((line) => record.excluded.includes(line.id))
    .map((line) => line.name);
  const top = (
    <View style={styles.top}>
      <Button
        label={t('recipes:cook.leave')}
        variant="ghost"
        onPress={() => {
          setLeaving(true);
        }}
      />
      <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.title}>
        {record.recipe.title}
      </Text>
    </View>
  );
  const leaveDialog = (
    <ConfirmDialog
      visible={leaving}
      title={t('recipes:cook.leaveTitle')}
      body={t('recipes:cook.leaveBody')}
      confirmLabel={t('recipes:cook.stopCooking')}
      cancelLabel={t('recipes:cook.keepPlace')}
      destructive
      onCancel={() => {
        setLeaving(false);
        landOnRecipe();
      }}
      onConfirm={() => {
        setLeaving(false);
        void cancelTimerEnd(record.timer?.notificationId ?? null);
        clearCook(recipeId);
        landOnRecipe();
      }}
    />
  );

  if (record.phase === 'check') {
    return (
      <Screen scroll>
        {top}
        <CheckView
          record={record}
          onToggle={(ingredientId) => {
            saveCook(toggleExcluded(record, ingredientId));
          }}
          onStart={() => {
            const cooking = beginCooking(record);
            if (cooking !== null) saveCook(cooking);
          }}
        />
        {leaveDialog}
      </Screen>
    );
  }

  const step = currentStep(record);
  if (step === undefined) {
    return <Screen />;
  }
  const index = stepIndex(record);
  const total = liveSteps(record).length;
  const last = index === total - 1;

  const startTimer = async (target: CookRecord) => {
    if (step.durationSeconds === null) return;
    await cancelTimerEnd(target.timer?.notificationId ?? null);
    const notificationId = await scheduleTimerEnd(
      t('recipes:cook.notificationTitle', { number: index + 1 }),
      step.body,
      step.durationSeconds,
    );
    setTimeUp(null);
    saveCook(
      setTimer(target, {
        stepId: step.id,
        endsAt: Date.now() + step.durationSeconds * 1000,
        notificationId,
      }),
    );
  };

  const onStart = () => {
    if (record.timer !== null && record.timer.stepId !== step.id) {
      setReplacing(true);
      return;
    }
    void startTimer(record);
  };

  const onStop = () => {
    void cancelTimerEnd(record.timer?.notificationId ?? null);
    saveCook(setTimer(record, null));
  };

  const onDone = () => {
    const outcome = advance(record);
    if (outcome.kind === 'finished') {
      void cancelTimerEnd(record.timer?.notificationId ?? null);
      queueFinishedCook(record);
      clearCook(recipeId);
      landOnRecipe();
      return;
    }
    setTimeUp(null);
    saveCook(outcome.record);
  };

  const timerState: TimerState =
    timeUp === step.id
      ? { kind: 'done' }
      : record.timer === null
        ? { kind: 'idle', seconds: step.durationSeconds ?? 0 }
        : record.timer.stepId === step.id
          ? {
              kind: 'running',
              endsAt: record.timer.endsAt,
              silent: record.timer.notificationId === null,
            }
          : {
              kind: 'elsewhere',
              stepNumber: liveSteps(record).findIndex((s) => s.id === record.timer?.stepId) + 1,
              endsAt: record.timer.endsAt,
            };
  const showTimer = step.durationSeconds !== null || timerState.kind === 'elsewhere';

  return (
    <Screen scroll>
      {top}
      {withoutNames.length === 0 ? null : (
        <Text variant="caption" color="textSecondary" style={styles.without}>
          {t('recipes:cook.without', { list: withoutNames.join(', ') })}
        </Text>
      )}
      <Animated.View
        key={step.id}
        {...(reduced ? {} : { entering: SlideInRight.duration(theme.duration.durationFast) })}
      >
        <Stack gap="space5">
          <StepView
            recipe={record.recipe}
            step={step}
            number={index + 1}
            total={total}
            done={record.done}
            excluded={record.excluded}
            onDone={onDone}
            onToggleMeanwhile={(stepId) => {
              saveCook(toggleDone(record, stepId));
            }}
            onShowPhoto={() => {
              if (step.imageKey !== null) setPhoto(imageUrl(step.imageKey));
            }}
          />
          {showTimer ? (
            <TimerBlock state={timerState} onStart={onStart} onStop={onStop} onEnded={ended} />
          ) : null}
        </Stack>
      </Animated.View>
      <View style={styles.bottom}>
        {index === 0 ? null : (
          <Button
            label={t('recipes:cook.back')}
            variant="ghost"
            onPress={() => {
              setTimeUp(null);
              saveCook(goBack(record));
            }}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={last ? t('recipes:cook.finish') : t('recipes:cook.done')}
          onPress={onDone}
          style={({ pressed }) => [styles.doneBar, pressed ? styles.pressed : null]}
        >
          <Text variant="title" color="onAccent">
            {last ? t('recipes:cook.finish') : t('recipes:cook.done')}
          </Text>
        </Pressable>
      </View>
      <PhotoViewer
        uri={photo}
        label={t('recipes:cook.showPhoto')}
        onClose={() => {
          setPhoto(null);
        }}
      />
      {leaveDialog}
      <ConfirmDialog
        visible={replacing}
        title={t('recipes:cook.replaceTitle')}
        body={t('recipes:cook.replaceBody')}
        confirmLabel={t('recipes:cook.replaceConfirm')}
        cancelLabel={t('recipes:cook.replaceCancel')}
        onCancel={() => {
          setReplacing(false);
        }}
        onConfirm={() => {
          setReplacing(false);
          void startTimer(record);
        }}
      />
    </Screen>
  );
}
