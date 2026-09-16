import { useLocalSearchParams } from 'expo-router';

import { NeedsScreen } from '@/features/recipes/NeedsScreen';

export default function NeedsRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NeedsScreen recipeId={id} />;
}
