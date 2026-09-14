import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { createQueryClient, wireQueryToDevice } from '@/query/client';

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => wireQueryToDevice(), []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        {/* 0003 replaces this with the (auth) and (app) groups. */}
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
