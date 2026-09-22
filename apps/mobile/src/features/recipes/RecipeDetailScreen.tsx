import { ApiError } from '@panna/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';

import { NeedsSection } from './components/NeedsSection';
import { StepsSection } from './components/StepsSection';
import { describeMeta } from './format';
import { useDeleteRecipe, useRecipe, useUpdateRecipe } from './queries';
import { styles } from './RecipeDetailScreen.styles';

import { imageUrl } from '@/api/images';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { startCook, useCooks } from '@/features/cooking/store';
import { useIsOnline } from '@/query/useIsOnline';

export interface RecipeDetailScreenProps {
  readonly recipeId: string;
}

export function RecipeDetailScreen({ recipeId }: RecipeDetailScreenProps): React.JSX.Element {
  const recipe = useRecipe(recipeId);
  const remove = useDeleteRecipe(recipeId);
  const status = useUpdateRecipe(recipeId);
  const online = useIsOnline();
  const [statusOffline, setStatusOffline] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const cooking = useCooks().some((cook) => cook.recipe.id === recipeId);

  const backToList = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (recipe.isPending) {
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
            title={t('recipes:detail.notFound.title')}
            body={t('recipes:detail.notFound.body')}
            action={
              <Button
                label={t('recipes:detail.notFound.action')}
                variant="secondary"
                onPress={backToList}
              />
            }
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
  const meta = [describeMeta(data, t)];
  if (data.status === 'draft') meta.push(t('recipes:status.draft'));

  return (
    <Screen scroll withHeader>
      <Stack gap="space4" style={styles.body}>
        {data.coverImageKey === null ? null : (
          <Image
            source={{ uri: imageUrl(data.coverImageKey) }}
            style={styles.cover}
            accessibilityIgnoresInvertColors
            accessibilityLabel={t('recipes:photo.coverOf', { title: data.title })}
          />
        )}
        <Stack gap="space1">
          <Text variant="title" accessibilityRole="header">
            {data.title}
          </Text>
          <Text variant="caption" color="textSecondary">
            {meta.join(' · ')}
          </Text>
        </Stack>
        {data.description === null ? null : <Text variant="body">{data.description}</Text>}
        <NeedsSection ingredients={data.ingredients} equipment={data.equipment} />
        <StepsSection
          steps={data.steps}
          ingredients={data.ingredients}
          equipment={data.equipment}
        />
        <View style={styles.actions}>
          <Stack gap="space3">
            {data.steps.length === 0 ? null : (
              <Button
                label={cooking ? t('recipes:cook.continue') : t('recipes:cook.start')}
                onPress={() => {
                  // The record is written here, from the recipe on screen, so the guide never fetches.
                  if (!cooking) startCook(data);
                  router.push({ pathname: '/recipes/[id]/cook', params: { id: recipeId } });
                }}
              />
            )}
            {data.status === 'draft' ? (
              <Button
                label={t('recipes:status.markReady')}
                variant="secondary"
                loading={status.isPending}
                onPress={() => {
                  // A write attempted offline fails at once and changes nothing, per CLAUDE.md.
                  if (!online) {
                    setStatusOffline(true);
                    return;
                  }
                  setStatusOffline(false);
                  status.mutate({ status: 'ready' });
                }}
              />
            ) : null}
            <Button
              label={t('recipes:detail.edit')}
              variant="secondary"
              onPress={() => {
                router.push({ pathname: '/recipes/[id]/edit', params: { id: recipeId } });
              }}
            />
            <Button
              label={t('recipes:detail.delete')}
              variant="danger"
              loading={remove.isPending}
              onPress={() => {
                setConfirming(true);
              }}
            />
          </Stack>
        </View>
        {statusOffline && !online ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('common:offline.save')}
          </Text>
        ) : status.isError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('recipes:status.failed')}
          </Text>
        ) : null}
        {remove.isError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {online ? t('recipes:detail.deleteFailed') : t('common:offline.delete')}
          </Text>
        ) : null}
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
          remove.mutate(undefined, { onSuccess: backToList });
        }}
      />
    </Screen>
  );
}
