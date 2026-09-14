import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { createQueryClient, wireQueryToDevice } from '@/query/client';

/**
 * Anchors every deep link on the home screen, so opening a link straight into a stacked
 * screen still has somewhere to go back to rather than trapping the user there. Shared
 * recipe links in 0009 need exactly this.
 */
export const unstable_settings = { initialRouteName: 'index' };

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => wireQueryToDevice(), []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <StatusBar style="dark" />
          {/* 0003 replaces this with the (auth) and (app) groups. */}
          <Stack screenOptions={{ headerShown: false }}>
            {/*
              The gallery is the one stacked screen so far, and it gets the platform's
              own header rather than a drawn back button - that is the Platform
              behaviour rule in CLAUDE.md, and it brings the swipe-back gesture with it.
            */}
            {/* The header stays hidden here; iOS still reads the title for the back button. */}
            <Stack.Screen name="index" options={{ title: 'Panna' }} />
            <Stack.Screen name="design" options={{ headerShown: true, title: 'Design system' }} />
          </Stack>
        </KeyboardProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
