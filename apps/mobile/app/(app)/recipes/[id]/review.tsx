import { useLocalSearchParams } from 'expo-router';

import { ReviewScreen } from '@/features/recipes/ReviewScreen';

export default function ReviewRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReviewScreen recipeId={id} />;
}
