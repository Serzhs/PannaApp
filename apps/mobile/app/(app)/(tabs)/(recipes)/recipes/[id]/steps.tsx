import { useLocalSearchParams } from 'expo-router';

import { StepsScreen } from '@/features/recipes/StepsScreen';

export default function StepsRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StepsScreen recipeId={id} />;
}
