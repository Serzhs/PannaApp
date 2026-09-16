import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  ListHeaderTitle,
  NewRecipeButton,
  SettingsButton,
} from '@/features/recipes/components/ListHeader';

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
      <Stack.Screen name="recipes/[id]/index" options={{ title: t('recipes:screens.detail') }} />
      <Stack.Screen name="recipes/[id]/edit" options={{ title: t('recipes:screens.edit') }} />
      <Stack.Screen name="settings" options={{ title: t('settings:screen') }} />
      <Stack.Screen name="design" options={{ title: 'Design system' }} />
    </Stack>
  );
}
