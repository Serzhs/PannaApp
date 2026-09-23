import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, useGlobalSearchParams, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import '@/i18n';
import { watchCookQueue } from '@/features/cooking/history';
import { LocaleSync } from '@/i18n/LocaleSync';
import { createPersister, queryClient, persistOptions, wireQueryToDevice } from '@/query/client';

/**
 * Anchors every deep link on the group's first screen, so opening a link straight into
 * a stacked screen still has somewhere to go back to. Shared recipe links in 0009 need
 * exactly this.
 */
export const unstable_settings = { initialRouteName: '(app)' };

/** Gesture handling needs to own the root, and it needs the root to fill the screen. */
const styles = StyleSheet.create({ root: { flex: 1 } });

/**
 * Sends the user to the group that matches their session, and does nothing at all while
 * the keychain is still being read - which is what stops a cold start from flashing the
 * sign-in screen at someone who is already signed in.
 */
function SessionRouter() {
  const { session } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useGlobalSearchParams<{ token?: string; api?: string }>();
  const pendingLink = useRef<{ token: string; api?: string } | null>(null);

  useEffect(() => {
    if (session === undefined) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (session === null && !inAuthGroup) {
      // A share link opened signed out comes back here once signed in (0017).
      if (segments[1] === 'shared' && params.token !== undefined) {
        pendingLink.current = {
          token: params.token,
          ...(params.api === undefined ? {} : { api: params.api }),
        };
      }
      router.replace('/(auth)');
    }
    if (session !== null && inAuthGroup) {
      const link = pendingLink.current;
      pendingLink.current = null;
      router.replace('/(app)');
      if (link !== null) router.push({ pathname: '/(app)/shared/[token]', params: link });
    }
  }, [session, segments, router, params.token, params.api]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ title: t('common:appName') }} />
      <Stack.Screen name="(app)" options={{ title: t('common:appName') }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [client] = useState(queryClient);
  const [persister] = useState(createPersister);

  useEffect(() => wireQueryToDevice(), []);
  useEffect(() => watchCookQueue(), []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <PersistQueryClientProvider
          client={client}
          persistOptions={{ persister, ...persistOptions }}
        >
          <KeyboardProvider>
            <AuthProvider>
              <LocaleSync />
              <StatusBar style="dark" />
              <SessionRouter />
            </AuthProvider>
          </KeyboardProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
