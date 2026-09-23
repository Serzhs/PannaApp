import { useLocalSearchParams } from 'expo-router';

import { FeaturedRecipeScreen } from '@/features/featured/FeaturedRecipeScreen';

export default function FeaturedRecipeRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FeaturedRecipeScreen recipeId={id} />;
}
