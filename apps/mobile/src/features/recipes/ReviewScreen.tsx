import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NeedsSection } from './components/NeedsSection';
import { StepsSection } from './components/StepsSection';
import { describeMeta } from './format';
import { useDeleteRecipe, useRecipe, useUpdateRecipe } from './queries';
import { styles } from './ReviewScreen.styles';

import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Spinner } from '@/components/Spinner';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useIsOnline } from '@/query/useIsOnline';

export interface ReviewScreenProps {
  readonly recipeId: string;
}

/**
 * The last page of the create flow: the recipe as a reader will see it, then what to do
 * with it (0026). Save marks it ready, Close puts it aside as a draft, Delete throws it away.
 * All three land on the list (0027), where the recipe shows up as new.
 */
export function ReviewScreen({ recipeId }: ReviewScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useIsOnline();
  const recipe = useRecipe(recipeId);
  const update = useUpdateRecipe(recipeId);
  const remove = useDeleteRecipe(recipeId);
  const [triedOffline, setTriedOffline] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const landOnList = () => {
    router.replace('/');
  };

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
  const data = recipe.data;

  // A write attempted offline fails at once and changes nothing, per CLAUDE.md.
  const save = () => {
    if (!online) {
      setTriedOffline(true);
      return;
    }
    setTriedOffline(false);
    update.mutate({ status: 'ready' }, { onSuccess: landOnList });
  };
  const askToDelete = () => {
    if (!online) {
      setTriedOffline(true);
      return;
    }
    setTriedOffline(false);
    setConfirming(true);
  };

  return (
    <Screen scroll withHeader>
      <Stack gap="space5" style={styles.body}>
        <Stack gap="space1">
          <Text variant="title" accessibilityRole="header">
            {data.title}
          </Text>
          <Text variant="caption" color="textSecondary">
            {describeMeta(data, t)}
          </Text>
        </Stack>
        {data.description === null ? null : <Text variant="body">{data.description}</Text>}
        <NeedsSection ingredients={data.ingredients} equipment={data.equipment} />
        <StepsSection
          steps={data.steps}
          ingredients={data.ingredients}
          equipment={data.equipment}
        />
        {triedOffline && !online ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('common:offline.save')}
          </Text>
        ) : update.isError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('recipes:status.failed')}
          </Text>
        ) : remove.isError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('recipes:detail.deleteFailed')}
          </Text>
        ) : null}
        <Stack gap="space3">
          <Button label={t('recipes:review.save')} loading={update.isPending} onPress={save} />
          <Stack gap="space1">
            <Button label={t('recipes:review.close')} variant="secondary" onPress={landOnList} />
            <Text variant="caption" color="textSecondary" style={styles.closeNote}>
              {t('recipes:review.closeNote')}
            </Text>
          </Stack>
          <Button
            label={t('recipes:review.delete')}
            variant="danger"
            loading={remove.isPending}
            onPress={askToDelete}
          />
        </Stack>
      </Stack>
      <ConfirmDialog
        visible={confirming}
        title={t('recipes:detail.confirmDelete.title')}
        body={t('recipes:detail.confirmDelete.body')}
        confirmLabel={t('recipes:detail.confirmDelete.confirm')}
        cancelLabel={t('recipes:detail.confirmDelete.cancel')}
        destructive
        onCancel={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          remove.mutate(undefined, { onSuccess: landOnList });
        }}
      />
    </Screen>
  );
}
