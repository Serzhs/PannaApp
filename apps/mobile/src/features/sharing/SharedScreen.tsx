import { ApiError, type SharedRecipe } from '@panna/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'react-native';

import { getShared } from './shared.api';
import { styles } from './SharedScreen.styles';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { NeedsSection } from '@/features/recipes/components/NeedsSection';
import { StepsSection } from '@/features/recipes/components/StepsSection';
import { describeMeta } from '@/features/recipes/format';
import { useSaveShared } from '@/features/recipes/queries';
import { useIsOnline } from '@/query/useIsOnline';

export interface SharedScreenProps {
  readonly token: string;
  /** Where the link says the author's API is. */
  readonly apiUrl: string;
}

export const sharedKeys = {
  one: (apiUrl: string, token: string) => ['shared', apiUrl, token] as const,
};

/**
 * A recipe someone sent (0017): read-only, headed by who shared it, with one thing to
 * do. Cooking it means keeping it first, so the cook is always the recipe's owner.
 */
export function SharedScreen({ token, apiUrl }: SharedScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useIsOnline();
  const save = useSaveShared();
  const shared = useQuery({
    queryKey: sharedKeys.one(apiUrl, token),
    queryFn: () => getShared(apiUrl, token),
    retry: false,
  });

  if (shared.isPending) {
    return (
      <Screen withHeader>
        <Stack
          gap="space4"
          style={styles.body}
          accessibilityLabel={t('recipes:detail.loading')}
          accessible
        >
          <Skeleton.Text variant="title" lines={1} lastLineWidth="70%" />
          <Skeleton.Text variant="body" lines={3} />
        </Stack>
      </Screen>
    );
  }
  if (shared.isError) {
    const gone = shared.error instanceof ApiError && shared.error.status === 404;
    return (
      <Screen withHeader>
        {gone ? (
          <EmptyState title={t('recipes:share.goneTitle')} body={t('recipes:share.goneBody')} />
        ) : (
          <ErrorState
            variant={online ? 'failure' : 'offline'}
            onRetry={() => void shared.refetch()}
          />
        )}
      </Screen>
    );
  }
  const data: SharedRecipe = shared.data;

  return (
    <Screen scroll withHeader>
      <Stack gap="space4" style={styles.body}>
        {data.coverImageKey === null ? null : (
          <Image
            source={{ uri: `${apiUrl}/api/images/${data.coverImageKey}` }}
            style={styles.cover}
            accessibilityIgnoresInvertColors
            accessibilityLabel={t('recipes:photo.coverOf', { title: data.title })}
          />
        )}
        <Stack gap="space1">
          <Text variant="caption" color="accent">
            {t('recipes:share.sharedBy', { name: data.authorName })}
          </Text>
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
          imageBaseUrl={apiUrl}
        />
        {save.isError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {online ? t('recipes:share.saveFailed') : t('common:offline.save')}
          </Text>
        ) : null}
        <Button
          label={t('recipes:share.add')}
          loading={save.isPending}
          onPress={() => {
            save.mutate(token, {
              onSuccess: (copy) => {
                router.replace({ pathname: '/recipes/[id]', params: { id: copy.id } });
              },
            });
          }}
        />
      </Stack>
    </Screen>
  );
}
