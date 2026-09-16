import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { createQueryClient, wireQueryToDevice } from '@/query/client';

/**
 * Anchors every deep link on the group's first screen, so opening a link straight into
 * a stacked screen still has somewhere to go back to. Shared recipe links in 0009 need
 * exactly this.
 */
export const unstable_settings = { initialRouteName: '(app)' };

/**
 * Sends the user to the group that matches their session, and does nothing at all while
 * the keychain is still being read - which is what stops a cold start from flashing the
 * sign-in screen at someone who is already signed in.
 */
function SessionRouter() {
  const { session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (session === undefined) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (session === null && !inAuthGroup) router.replace('/(auth)');
    if (session !== null && inAuthGroup) router.replace('/(app)');
  }, [session, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ title: 'Panna' }} />
      <Stack.Screen name="(app)" options={{ title: 'Panna' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => wireQueryToDevice(), []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <SessionRouter />
          </AuthProvider>
        </KeyboardProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
