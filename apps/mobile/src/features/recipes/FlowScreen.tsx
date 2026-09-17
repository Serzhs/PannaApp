import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FlowChart } from './components/FlowChart';
import { FlowEditor } from './components/FlowEditor';
import { styles } from './FlowScreen.styles';
import { useRecipe, useUpdateRecipe } from './queries';
import { draftFromSteps, validateSteps, type StepDraft } from './steps';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Spinner } from '@/components/Spinner';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useIsOnline } from '@/query/useIsOnline';

export interface FlowScreenProps {
  readonly recipeId: string;
}

/** The fourth page of the create flow: say what runs during what, then on to the review. */
export function FlowScreen({ recipeId }: FlowScreenProps): React.JSX.Element {
  const recipe = useRecipe(recipeId);
  const online = useIsOnline();
  const { t } = useTranslation();

  if (recipe.data === undefined) {
    return (
      <Screen withHeader>
        {recipe.isError ? (
          <ErrorState
            variant={online ? 'failure' : 'offline'}
            onRetry={() => void recipe.refetch()}
          />
        ) : (
          <Spinner label={t('recipes:detail.loading')} />
        )}
      </Screen>
    );
  }

  return <FlowForm recipeId={recipeId} initial={draftFromSteps(recipe.data.steps)} />;
}

function FlowForm({
  recipeId,
  initial,
}: {
  readonly recipeId: string;
  readonly initial: StepDraft[];
}): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useIsOnline();
  const update = useUpdateRecipe(recipeId);
  const [draft, setDraft] = useState(initial);
  const [triedOffline, setTriedOffline] = useState(false);

  const continueToReview = () => {
    router.replace({ pathname: '/recipes/[id]/review', params: { id: recipeId } });
  };

  const done = () => {
    if (!online) {
      setTriedOffline(true);
      return;
    }
    // The steps were saved on the page before, so the only thing that can be wrong here is the structure.
    const outcome = validateSteps(draft);
    if (!outcome.ok) return;
    update.mutate({ steps: outcome.steps }, { onSuccess: continueToReview });
  };

  return (
    <Screen scroll withHeader>
      <Stack gap="space6" style={styles.body}>
        <Stack gap="space3">
          <Text variant="heading" accessibilityRole="header">
            {t('recipes:flow.title')}
          </Text>
          <FlowEditor
            value={draft}
            onChange={(next) => {
              setDraft(next);
              setTriedOffline(false);
            }}
          />
        </Stack>
        <Stack gap="space3">
          <Text variant="heading" accessibilityRole="header">
            {t('recipes:flow.overview')}
          </Text>
          <FlowChart steps={draft} />
        </Stack>
        {triedOffline && !online ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('common:offline.save')}
          </Text>
        ) : update.isError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('recipes:form.failed')}
          </Text>
        ) : null}
        <Stack gap="space3">
          <Button label={t('recipes:flow.done')} loading={update.isPending} onPress={done} />
          <Button label={t('recipes:flow.skip')} variant="ghost" onPress={continueToReview} />
        </Stack>
      </Stack>
    </Screen>
  );
}
