import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The header stays hidden here; iOS still reads the title for the back button. */}
      <Stack.Screen name="index" options={{ title: 'Panna' }} />
      <Stack.Screen name="design" options={{ headerShown: true, title: 'Design system' }} />
    </Stack>
  );
}
