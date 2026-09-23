import { useLocalSearchParams } from 'expo-router';

import { EditRecipeScreen } from '@/features/recipes/EditRecipeScreen';

export default function EditRecipeRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditRecipeScreen recipeId={id} />;
}
