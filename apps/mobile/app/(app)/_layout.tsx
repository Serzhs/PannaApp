import { Stack } from 'expo-router';

// Cook mode sits above the tabs, so the bar is gone exactly there and nowhere else (0018).
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="recipes/[id]/cook" />
    </Stack>
  );
}
