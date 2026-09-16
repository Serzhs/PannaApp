import { Stack } from 'expo-router';

import {
  ListHeaderTitle,
  NewRecipeButton,
  SignOutButton,
} from '@/features/recipes/components/ListHeader';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Recipes',
          headerTitle: () => <ListHeaderTitle />,
          headerLeft: () => <SignOutButton />,
          headerRight: () => <NewRecipeButton />,
        }}
      />
      <Stack.Screen name="recipes/new" options={{ title: 'New recipe' }} />
      <Stack.Screen name="recipes/[id]/index" options={{ title: 'Recipe' }} />
      <Stack.Screen name="recipes/[id]/edit" options={{ title: 'Edit recipe' }} />
      <Stack.Screen name="design" options={{ title: 'Design system' }} />
    </Stack>
  );
}
