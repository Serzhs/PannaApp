import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export const unstable_settings = { initialRouteName: 'index' };

export default function FeaturedLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: t('recipes:screens.featured') }} />
      <Stack.Screen name="[id]" options={{ title: t('recipes:screens.featuredRecipe') }} />
    </Stack>
  );
}
