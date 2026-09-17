import { ApiError, ERROR_CODES } from '@panna/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { StepsEditor } from './components/StepsEditor';
import { useRecipe, useUpdateRecipe } from './queries';
import {
  dropBlank,
  emptyStep,
  stepErrorsFromServer,
  validateSteps,
  type StepDraft,
  type StepErrors,
} from './steps';
import { styles } from './StepsScreen.styles';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useIsOnline } from '@/query/useIsOnline';

export interface StepsScreenProps {
  readonly recipeId: string;
}

/** The third page of the create flow. Done saves the steps and goes on to the flow. */
export function StepsScreen({ recipeId }: StepsScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useIsOnline();
  const update = useUpdateRecipe(recipeId);
  // Page two just saved the lists, so the detail is in the cache; the chips need their ids.
  const recipe = useRecipe(recipeId);
  // The first step is open from the start (0024): the author types instead of pressing a button.
  const [draft, setDraft] = useState<StepDraft[]>(() => [emptyStep()]);
  const [errors, setErrors] = useState<StepErrors>({});
  const [triedOffline, setTriedOffline] = useState(false);

  useEffect(() => {
    if (update.error instanceof ApiError && update.error.body.fields !== undefined) {
      setErrors(stepErrorsFromServer(update.error.body.fields, draft));
    }
    // The draft is deliberately not a dependency: errors map onto the draft that was sent.
  }, [update.error]);

  // The flow page is next (0022); the review after it is what lands on the recipe.
  const continueToFlow = () => {
    router.replace({ pathname: '/recipes/[id]/flow', params: { id: recipeId } });
  };

  const done = () => {
    if (!online) {
      setTriedOffline(true);
      return;
    }
    const outcome = validateSteps(dropBlank(draft));
    if (!outcome.ok) {
      setErrors(outcome.errors);
      return;
    }
    setErrors({});
    update.mutate({ steps: outcome.steps }, { onSuccess: continueToFlow });
  };

  const failed =
    update.isError &&
    !(update.error instanceof ApiError && update.error.body.code === ERROR_CODES.VALIDATION_FAILED);

  return (
    <Screen scroll withHeader>
      <Stack gap="space6" style={styles.body}>
        <StepsEditor
          value={draft}
          errors={errors}
          ingredients={recipe.data?.ingredients ?? []}
          equipment={recipe.data?.equipment ?? []}
          onChange={(next) => {
            setDraft(next);
            setTriedOffline(false);
          }}
        />
        {triedOffline && !online ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('common:offline.save')}
          </Text>
        ) : failed ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('recipes:form.failed')}
          </Text>
        ) : null}
        <Stack gap="space3">
          <Button label={t('recipes:steps.done')} loading={update.isPending} onPress={done} />
          <Button label={t('recipes:steps.skip')} variant="ghost" onPress={continueToFlow} />
        </Stack>
      </Stack>
    </Screen>
  );
}
