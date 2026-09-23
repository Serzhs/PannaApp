import type { Recipe } from '@panna/shared';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { styles } from './FeaturedList.styles';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { RecipeRow, RecipeRowSkeleton } from '@/features/recipes/components/RecipeRow';

export type FeaturedListState = 'loading' | 'error' | 'offline' | 'ready';

export interface FeaturedListProps {
  readonly state: FeaturedListState;
  readonly recipes: readonly Recipe[];
  /** True when a search is on, so an empty list says "nothing matches" rather than "nothing here". */
  readonly searching: boolean;
  readonly onRetry: () => void;
  readonly onOpen: (recipe: Recipe) => void;
}

const SKELETON_ROWS = [0, 1, 2];

/** Every state given rather than fetched, like the own list, so each can be looked at alone. */
export function FeaturedList({
  state,
  recipes,
  searching,
  onRetry,
  onOpen,
}: FeaturedListProps): React.JSX.Element {
  const { t } = useTranslation();

  if (state === 'loading') {
    return (
      <View style={styles.rows} accessibilityLabel={t('recipes:featured.loading')} accessible>
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
    return searching ? (
      <EmptyState
        title={t('recipes:featured.noMatch.title')}
        body={t('recipes:featured.noMatch.body')}
      />
    ) : (
      <EmptyState
        title={t('recipes:featured.empty.title')}
        body={t('recipes:featured.empty.body')}
      />
    );
  }
  return (
    <FlatList
      data={recipes}
      keyExtractor={(recipe) => recipe.id}
      renderItem={({ item }) => <RecipeRow recipe={item} onPress={onOpen} plain />}
      contentContainerStyle={styles.rows}
      keyboardShouldPersistTaps="handled"
    />
  );
}
