import { ApiError } from '@panna/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { describeServings, describeTime } from './format';
import { useDeleteRecipe, useRecipe } from './queries';
import { styles } from './RecipeDetailScreen.styles';

import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { useIsOnline } from '@/query/useIsOnline';

export interface RecipeDetailScreenProps {
  readonly recipeId: string;
}

export function RecipeDetailScreen({ recipeId }: RecipeDetailScreenProps): React.JSX.Element {
  const recipe = useRecipe(recipeId);
  const remove = useDeleteRecipe(recipeId);
  const online = useIsOnline();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const backToList = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (recipe.isPending) {
    return (
      <Screen withHeader>
        <Stack gap="space4" style={styles.body} accessibilityLabel="Loading recipe" accessible>
          <Skeleton.Text variant="title" lines={1} lastLineWidth="70%" />
          <Skeleton.Text variant="body" lines={3} />
          <Skeleton.Text variant="caption" lines={2} lastLineWidth="50%" />
        </Stack>
      </Screen>
    );
  }

  if (recipe.isError && recipe.data === undefined) {
    const missing = recipe.error instanceof ApiError && recipe.error.status === 404;
    return (
      <Screen withHeader>
        {missing ? (
          <EmptyState
            title="Recipe not found"
            body="It may have been deleted."
            action={<Button label="Back to recipes" variant="secondary" onPress={backToList} />}
          />
        ) : (
          <ErrorState
            variant={online ? 'failure' : 'offline'}
            onRetry={() => void recipe.refetch()}
          />
        )}
      </Screen>
    );
  }

  const data = recipe.data;

  const meta = [describeServings(data.servings)];
  if (data.totalTimeMinutes !== null) meta.push(describeTime(data.totalTimeMinutes));

  return (
    <Screen scroll withHeader>
      <Stack gap="space4" style={styles.body}>
        <Stack gap="space1">
          <Text variant="title" accessibilityRole="header">
            {data.title}
          </Text>
          <Text variant="caption" color="textSecondary">
            {meta.join(' · ')}
            {data.status === 'draft' ? ' · Draft' : ''}
          </Text>
        </Stack>
        {data.description === null ? null : <Text variant="body">{data.description}</Text>}
        <View style={styles.actions}>
          <Stack gap="space3">
            <Button
              label="Edit"
              variant="secondary"
              onPress={() => {
                router.push({ pathname: '/recipes/[id]/edit', params: { id: recipeId } });
              }}
            />
            <Button
              label="Delete"
              variant="danger"
              loading={remove.isPending}
              onPress={() => {
                setConfirming(true);
              }}
            />
          </Stack>
        </View>
        {remove.isError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {online
              ? 'Could not delete the recipe. Try again.'
              : 'You are offline. Connect to the internet to delete.'}
          </Text>
        ) : null}
      </Stack>
      <ConfirmDialog
        visible={confirming}
        title="Delete this recipe?"
        body="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        onCancel={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          remove.mutate(undefined, { onSuccess: backToList });
        }}
      />
    </Screen>
  );
}
