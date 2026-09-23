import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { FeaturedList, type FeaturedListState } from './components/FeaturedList';
import { styles } from './FeaturedScreen.styles';
import { useFeatured } from './queries';

import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useIsOnline } from '@/query/useIsOnline';

/** Long enough that a word is typed, short enough that the list does not feel slow. */
const SEARCH_PAUSE_MS = 300;

/**
 * The Featured tab (0019): the recipes we wrote, with a search box over their titles. The
 * query follows the field after a pause, so a request is not sent for every keystroke.
 */
export function FeaturedScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useIsOnline();
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');
  const featured = useFeatured(q);

  useEffect(() => {
    const trimmed = typed.trim();
    if (trimmed === q) return;
    const handle = setTimeout(() => {
      setQ(trimmed);
    }, SEARCH_PAUSE_MS);
    return () => {
      clearTimeout(handle);
    };
  }, [typed, q]);

  // Cached data wins over an error, as on the own list; offline with nothing is its own state.
  const state: FeaturedListState = featured.isPending
    ? 'loading'
    : featured.isError && featured.data === undefined
      ? online
        ? 'error'
        : 'offline'
      : 'ready';

  return (
    <Screen withHeader>
      <View style={styles.search}>
        <TextField
          label={t('recipes:featured.search')}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <FeaturedList
        state={state}
        recipes={featured.data ?? []}
        searching={q.length > 0}
        onRetry={() => void featured.refetch()}
        onOpen={(recipe) => {
          router.push({ pathname: '/featured/[id]', params: { id: recipe.id } });
        }}
      />
    </Screen>
  );
}
