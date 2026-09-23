import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  ListHeaderTitle,
  NewRecipeButton,
  SettingsButton,
} from '@/features/recipes/components/ListHeader';

// A link opened cold, or kept across sign-in, lands on the shared screen with the list
// beneath it, so there is somewhere to go back to (0017).
export const unstable_settings = { initialRouteName: 'index' };

export default function AppLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: t('recipes:screens.list'),
          headerTitle: () => <ListHeaderTitle />,
          headerLeft: () => <SettingsButton />,
          headerRight: () => <NewRecipeButton />,
        }}
      />
      <Stack.Screen name="recipes/new" options={{ title: t('recipes:screens.new') }} />
      <Stack.Screen name="recipes/import" options={{ title: t('recipes:screens.import') }} />
      <Stack.Screen name="shared/[token]" options={{ title: t('recipes:screens.shared') }} />
      <Stack.Screen name="recipes/[id]/index" options={{ title: t('recipes:screens.detail') }} />
      <Stack.Screen name="recipes/[id]/edit" options={{ title: t('recipes:screens.edit') }} />
      <Stack.Screen name="recipes/[id]/steps" options={{ title: t('recipes:screens.steps') }} />
      <Stack.Screen name="recipes/[id]/flow" options={{ title: t('recipes:screens.flow') }} />
      <Stack.Screen name="recipes/[id]/review" options={{ title: t('recipes:screens.review') }} />
      <Stack.Screen name="recipes/[id]/cook" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: t('settings:screen') }} />
      <Stack.Screen name="design" options={{ title: 'Design system' }} />
    </Stack>
  );
}
