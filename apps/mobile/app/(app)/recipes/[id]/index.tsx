import { useLocalSearchParams } from 'expo-router';

import { RecipeDetailScreen } from '@/features/recipes/RecipeDetailScreen';

export default function RecipeDetailRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeDetailScreen recipeId={id} />;
}
