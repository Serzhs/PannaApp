import { useLocalSearchParams } from 'expo-router';

import { CookScreen } from '@/features/cooking/CookScreen';

export default function CookRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CookScreen recipeId={id} />;
}
