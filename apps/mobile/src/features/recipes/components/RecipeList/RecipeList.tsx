import type { Recipe } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { RecipeRow, RecipeRowSkeleton } from '../RecipeRow';

import { styles } from './RecipeList.styles';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Text } from '@/components/Text';
import { InProgressRow } from '@/features/cooking/components/InProgressRow';
import type { CookRecord } from '@/features/cooking/store';

export type RecipeListState = 'loading' | 'error' | 'offline' | 'ready';

export interface RecipeListProps {
  readonly state: RecipeListState;
  readonly recipes: readonly Recipe[];
  readonly onRetry: () => void;
  readonly onOpen: (recipe: Recipe) => void;
  readonly onCreate: () => void;
  /** Cooks in progress, shown first (0012). */
  readonly cooks?: readonly CookRecord[];
  readonly onContinue?: (record: CookRecord) => void;
}

const SKELETON_ROWS = [0, 1, 2];

/**
 * Every state a list can be in, given rather than fetched, so each can be looked at
 * and tested on its own. The screen decides which one applies.
 */
export function RecipeList({
  state,
  recipes,
  onRetry,
  onOpen,
  onCreate,
  cooks = [],
  onContinue,
}: RecipeListProps): React.JSX.Element {
  const { t } = useTranslation();
  const cookingIds = new Set(cooks.map((record) => record.recipe.id));
  const rest = recipes.filter((recipe) => !cookingIds.has(recipe.id));
  // Drafts sit apart (0033): a half-written recipe is not a dinner you could cook tonight.
  const ready = rest.filter((recipe) => recipe.status === 'ready');
  const drafts = rest.filter((recipe) => recipe.status === 'draft');
  const headed = cooks.length > 0 || drafts.length > 0;

  if (state === 'loading') {
    return (
      <View style={styles.rows} accessibilityLabel={t('recipes:list.loading')} accessible>
        {SKELETON_ROWS.map((row) => (
          <RecipeRowSkeleton key={row} />
        ))}
      </View>
    );
  }

  if (state === 'error' || state === 'offline') {
    return <ErrorState variant={state === 'offline' ? 'offline' : 'failure'} onRetry={onRetry} />;
  }

  if (recipes.length === 0 && cooks.length === 0) {
    return (
      <EmptyState
        title={t('recipes:list.empty.title')}
        body={t('recipes:list.empty.body')}
        action={<Button label={t('recipes:list.empty.action')} onPress={onCreate} />}
      />
    );
  }

  return (
    <FlatList
      data={ready}
      keyExtractor={(recipe) => recipe.id}
      renderItem={({ item }) => <RecipeRow recipe={item} onPress={onOpen} />}
      contentContainerStyle={styles.rows}
      ListFooterComponent={
        drafts.length === 0 ? null : (
          <View style={styles.section}>
            <Text variant="label" color="textSecondary" accessibilityRole="header">
              {t('recipes:list.drafts')}
            </Text>
            {drafts.map((draft) => (
              <RecipeRow key={draft.id} recipe={draft} onPress={onOpen} noStatusChip />
            ))}
          </View>
        )
      }
      ListHeaderComponent={
        cooks.length === 0 ? (
          headed && ready.length > 0 ? (
            <Text variant="label" color="textSecondary" accessibilityRole="header">
              {t('recipes:list.ready')}
            </Text>
          ) : null
        ) : (
          <View style={styles.section}>
            <Text variant="label" color="textSecondary" accessibilityRole="header">
              {t('recipes:cook.inProgress')}
            </Text>
            {cooks.map((record) => (
              <InProgressRow
                key={record.recipe.id}
                record={record}
                onPress={(cook) => {
                  onContinue?.(cook);
                }}
              />
            ))}
            {ready.length === 0 ? null : (
              <Text variant="label" color="textSecondary" accessibilityRole="header">
                {t('recipes:list.ready')}
              </Text>
            )}
          </View>
        )
      }
      ListHeaderComponentStyle={cooks.length === 0 ? undefined : styles.headed}
    />
  );
}
