import type { Recipe } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { RecipeRow, RecipeRowSkeleton } from '../RecipeRow';

import { styles } from './RecipeList.styles';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';

export type RecipeListState = 'loading' | 'error' | 'offline' | 'ready';

export interface RecipeListProps {
  readonly state: RecipeListState;
  readonly recipes: readonly Recipe[];
  readonly onRetry: () => void;
  readonly onOpen: (recipe: Recipe) => void;
  readonly onCreate: () => void;
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
}: RecipeListProps): React.JSX.Element {
  const { t } = useTranslation();

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

  if (recipes.length === 0) {
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
      data={recipes}
      keyExtractor={(recipe) => recipe.id}
      renderItem={({ item }) => <RecipeRow recipe={item} onPress={onOpen} />}
      contentContainerStyle={styles.rows}
    />
  );
}
