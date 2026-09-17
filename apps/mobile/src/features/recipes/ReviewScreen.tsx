import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';

import { NeedsSection } from './components/NeedsSection';
import { StepsSection } from './components/StepsSection';
import { describeMeta } from './format';
import { useRecipe, useUpdateRecipe } from './queries';
import { styles } from './ReviewScreen.styles';

import { Button } from '@/components/Button';
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
 * The last page of the create flow: the recipe as a reader will see it, and the one
 * decision left, whether it is ready. Off by default, because a recipe just typed in
 * usually has a mistake somewhere.
 */
export function ReviewScreen({ recipeId }: ReviewScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useIsOnline();
  const recipe = useRecipe(recipeId);
  const update = useUpdateRecipe(recipeId);
  const [ready, setReady] = useState(false);
  const [triedOffline, setTriedOffline] = useState(false);

  const landOnRecipe = () => {
    router.replace({ pathname: '/recipes/[id]', params: { id: recipeId } });
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

  const done = () => {
    if (!ready) {
      landOnRecipe();
      return;
    }
    if (!online) {
      setTriedOffline(true);
      return;
    }
    update.mutate({ status: 'ready' }, { onSuccess: landOnRecipe });
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
        <StepsSection steps={data.steps} />
        <View style={styles.switchRow}>
          <Stack gap="space0" style={styles.switchLabel}>
            <Text variant="bodyStrong">{t('recipes:review.ready')}</Text>
            <Text variant="caption" color="textSecondary">
              {t('recipes:review.readyHelper')}
            </Text>
          </Stack>
          <Switch
            accessibilityLabel={t('recipes:review.ready')}
            value={ready}
            onValueChange={(next) => {
              setReady(next);
              setTriedOffline(false);
            }}
          />
        </View>
        {triedOffline && !online ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('common:offline.save')}
          </Text>
        ) : update.isError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('recipes:status.failed')}
          </Text>
        ) : null}
        <Button label={t('recipes:review.done')} loading={update.isPending} onPress={done} />
      </Stack>
    </Screen>
  );
}
