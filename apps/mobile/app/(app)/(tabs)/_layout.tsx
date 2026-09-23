import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, type ColorValue } from 'react-native';

import { theme } from '@/styles/theme';

const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.borderSubtle,
  },
});

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

/** Three tabs (0018, 0019): yours, ours, you. */
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: styles.bar,
      }}
    >
      <Tabs.Screen
        name="(recipes)"
        options={{ title: t('common:tabs.recipes'), tabBarIcon: icon('book-outline') }}
      />
      <Tabs.Screen
        name="featured"
        options={{ title: t('common:tabs.featured'), tabBarIcon: icon('star-outline') }}
      />
      <Tabs.Screen
        name="you"
        options={{ title: t('common:tabs.you'), tabBarIcon: icon('person-circle-outline') }}
      />
    </Tabs>
  );
}
