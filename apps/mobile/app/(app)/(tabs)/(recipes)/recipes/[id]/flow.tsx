import { useLocalSearchParams } from 'expo-router';

import { FlowScreen } from '@/features/recipes/FlowScreen';

export default function FlowRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FlowScreen recipeId={id} />;
}
