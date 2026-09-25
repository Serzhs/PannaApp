import { useLocalSearchParams } from 'expo-router';

import { HistoryScreen } from '@/features/recipes/HistoryScreen';

export default function HistoryRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <HistoryScreen recipeId={id} />;
}
