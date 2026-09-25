import { ApiError } from '@panna/shared';
import { Stack as RouteStack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform, Pressable, Share, View } from 'react-native';

import { CookBar } from './components/CookBar';
import { NeedsSection } from './components/NeedsSection';
import { NoteList } from './components/NoteList';
import { StepsSection } from './components/StepsSection';
import { describeMade, describeMeta } from './format';
import {
  useDeleteRecipe,
  useRecipe,
  useShareRecipe,
  useUnshareRecipe,
  useUpdateRecipe,
} from './queries';
import { styles } from './RecipeDetailScreen.styles';

import { imageUrl } from '@/api/images';
import { showActionMenu, type MenuAction } from '@/components/ActionMenu';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { HeaderIcon } from '@/components/HeaderIcon';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { queuedCooks } from '@/features/cooking/history';
import { startCook, useCooks } from '@/features/cooking/store';
import { useIsOnline } from '@/query/useIsOnline';

export interface RecipeDetailScreenProps {
  readonly recipeId: string;
}

export function RecipeDetailScreen({ recipeId }: RecipeDetailScreenProps): React.JSX.Element {
  const recipe = useRecipe(recipeId);
  const remove = useDeleteRecipe(recipeId);
  const status = useUpdateRecipe(recipeId);
  const share = useShareRecipe(recipeId);
  const unshare = useUnshareRecipe(recipeId);
  const [unsharing, setUnsharing] = useState(false);
  const online = useIsOnline();
  const [statusOffline, setStatusOffline] = useState(false);
  const router = useRouter();
  const { t, i18n } = useTranslation();
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
  if (data.sourceRecipeId !== null) meta.push(t('recipes:share.savedFromLink'));
  // A cook that is finished but not yet sent still counts: the person who made it is looking.
  const pending = queuedCooks(recipeId);
  const lastPending =
    pending
      .map((cook) => cook.finishedAt)
      .sort()
      .at(-1) ?? null;
  const made = describeMade(
    data.cookCount + pending.length,
    [data.lastCookedAt, lastPending]
      .filter((v): v is string => v !== null)
      .sort()
      .at(-1) ?? null,
    t,
    i18n.language,
  );

  const cooked = data.cookCount + pending.length > 0;
  const openHistory = () => {
    router.push({ pathname: '/recipes/[id]/history', params: { id: recipeId } });
  };
  const shareNow = () => {
    if (!online) {
      setStatusOffline(true);
      return;
    }
    setStatusOffline(false);
    share.mutate(undefined, {
      onSuccess: (link) => {
        // The platform's own sheet. iOS wants a url, Android a message; both is two links.
        void Share.share(Platform.OS === 'ios' ? { url: link.url } : { message: link.url });
      },
    });
  };
  const openMenu = () => {
    const actions: MenuAction[] = [
      {
        label: t('recipes:detail.edit'),
        onPress: () => {
          router.push({ pathname: '/recipes/[id]/edit', params: { id: recipeId } });
        },
      },
    ];
    if (data.status === 'draft') {
      actions.push({
        label: t('recipes:status.markReady'),
        onPress: () => {
          // A write attempted offline fails at once and changes nothing, per CLAUDE.md.
          if (!online) {
            setStatusOffline(true);
            return;
          }
          setStatusOffline(false);
          status.mutate({ status: 'ready' });
        },
      });
    }
    if (data.shareToken !== null) {
      actions.push({
        label: t('recipes:share.stop'),
        onPress: () => {
          setUnsharing(true);
        },
      });
    }
    actions.push({
      label: t('recipes:detail.delete'),
      destructive: true,
      onPress: () => {
        setConfirming(true);
      },
    });
    showActionMenu({ title: data.title, actions, cancelLabel: t('common:cancel') });
  };

  return (
    <Screen
      scroll
      withHeader
      footer={
        data.steps.length === 0 ? null : (
          <CookBar
            continuing={cooking}
            onPress={() => {
              // The record is written here, from the recipe on screen, so the guide never fetches.
              if (!cooking) startCook(data);
              router.push({ pathname: '/recipes/[id]/cook', params: { id: recipeId } });
            }}
          />
        )
      }
    >
      {/* The header's actions belong to this recipe, so the screen sets them (0029). */}
      <RouteStack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              {data.status === 'ready' ? (
                <HeaderIcon
                  name={data.shareToken === null ? 'share-outline' : 'share'}
                  label={
                    data.shareToken === null
                      ? t('recipes:share.share')
                      : t('recipes:share.sharedByLink')
                  }
                  disabled={share.isPending}
                  onPress={shareNow}
                />
              ) : null}
              <HeaderIcon
                name="ellipsis-horizontal"
                label={t('recipes:detail.more')}
                onPress={openMenu}
              />
            </View>
          ),
        }}
      />
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
          {made === null ? null : cooked ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={made}
              accessibilityHint={t('recipes:history.openHint')}
              onPress={openHistory}
              hitSlop={styles.madeHitSlop.margin}
            >
              <Text variant="caption" color="accent">
                {made} ›
              </Text>
            </Pressable>
          ) : (
            <Text variant="caption" color="textSecondary">
              {made}
            </Text>
          )}
        </Stack>
        {data.description === null ? null : <Text variant="body">{data.description}</Text>}
        <NeedsSection ingredients={data.ingredients} equipment={data.equipment} />
        <StepsSection
          steps={data.steps}
          ingredients={data.ingredients}
          equipment={data.equipment}
        />
        {data.notes.length === 0 ? null : (
          <Stack gap="space3">
            <Text variant="heading" accessibilityRole="header">
              {t('recipes:notes.title')}
            </Text>
            <NoteList
              notes={data.notes}
              stepLabel={(stepId) => {
                const index = data.steps.findIndex((step) => step.id === stepId);
                return index < 0 ? null : t('recipes:notes.onStep', { number: index + 1 });
              }}
            />
          </Stack>
        )}
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
        visible={unsharing}
        title={t('recipes:share.stopTitle')}
        body={t('recipes:share.stopBody')}
        confirmLabel={t('recipes:share.stopConfirm')}
        cancelLabel={t('recipes:share.stopCancel')}
        destructive
        onCancel={() => {
          setUnsharing(false);
        }}
        onConfirm={() => {
          setUnsharing(false);
          unshare.mutate();
        }}
      />
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
