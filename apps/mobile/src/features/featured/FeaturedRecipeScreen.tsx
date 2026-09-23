import type { SharedRecipe } from '@panna/shared';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { styles } from './FeaturedRecipeScreen.styles';
import { useFeaturedRecipe, useSaveFeatured } from './queries';

import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Stack } from '@/components/Stack';
import { ReadOnlyRecipe } from '@/features/recipes/components/ReadOnlyRecipe';
import { useIsOnline } from '@/query/useIsOnline';

export interface FeaturedRecipeScreenProps {
  readonly recipeId: string;
}

/** One of ours, read-only (0019): the same screen a shared recipe gets, headed "By Panna". */
export function FeaturedRecipeScreen({ recipeId }: FeaturedRecipeScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useIsOnline();
  const save = useSaveFeatured();
  const featured = useFeaturedRecipe(recipeId);

  if (featured.isPending) {
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
  if (featured.isError) {
    return (
      <Screen withHeader>
        <ErrorState
          variant={online ? 'failure' : 'offline'}
          onRetry={() => void featured.refetch()}
        />
      </Screen>
    );
  }
  const data: SharedRecipe = featured.data;

  return (
    <Screen scroll withHeader>
      <ReadOnlyRecipe
        recipe={data}
        headline={t('recipes:featured.by', { name: data.authorName })}
        adding={save.isPending}
        addError={
          save.isError ? (online ? t('recipes:share.saveFailed') : t('common:offline.save')) : null
        }
        onAdd={() => {
          save.mutate(recipeId, {
            onSuccess: (copy) => {
              // Featured goes back to its list; the copy opens in the Recipes tab, where it lives.
              router.back();
              router.push({ pathname: '/recipes/[id]', params: { id: copy.id } });
            },
          });
        }}
      />
    </Screen>
  );
}
