import { useRouter } from 'expo-router';

import { RecipeList, type RecipeListState } from './components/RecipeList';
import { useRecipes } from './queries';

import { Screen } from '@/components/Screen';
import { useCooks } from '@/features/cooking/store';
import { useIsOnline } from '@/query/useIsOnline';

export function RecipeListScreen(): React.JSX.Element {
  const recipes = useRecipes();
  const online = useIsOnline();
  const router = useRouter();
  const cooks = useCooks();

  // Cached data wins over an error: a list you have seen beats a message about the one
  // you cannot fetch. Offline with nothing cached is its own state, with its own words.
  const state: RecipeListState = recipes.isPending
    ? 'loading'
    : recipes.isError && recipes.data === undefined
      ? online
        ? 'error'
        : 'offline'
      : 'ready';

  return (
    <Screen withHeader>
      <RecipeList
        state={state}
        recipes={recipes.data ?? []}
        onRetry={() => void recipes.refetch()}
        onOpen={(recipe) => {
          router.push({ pathname: '/recipes/[id]', params: { id: recipe.id } });
        }}
        onCreate={() => {
          router.push('/recipes/new');
        }}
        cooks={cooks}
        onContinue={(record) => {
          router.push({ pathname: '/recipes/[id]/cook', params: { id: record.recipe.id } });
        }}
      />
    </Screen>
  );
}
