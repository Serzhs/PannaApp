import { ApiError, type SharedRecipe } from '@panna/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { getShared } from './shared.api';
import { styles } from './SharedScreen.styles';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Stack } from '@/components/Stack';
import { ReadOnlyRecipe } from '@/features/recipes/components/ReadOnlyRecipe';
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
      <ReadOnlyRecipe
        recipe={data}
        headline={t('recipes:share.sharedBy', { name: data.authorName })}
        imageBaseUrl={apiUrl}
        adding={save.isPending}
        addError={
          save.isError ? (online ? t('recipes:share.saveFailed') : t('common:offline.save')) : null
        }
        onAdd={() => {
          save.mutate(token, {
            onSuccess: (copy) => {
              router.replace({ pathname: '/recipes/[id]', params: { id: copy.id } });
            },
          });
        }}
      />
    </Screen>
  );
}
