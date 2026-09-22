import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';
import Storage from 'expo-sqlite/kv-store';
import { AppState, type AppStateStatus } from 'react-native';

/** Anything cached longer ago than this is dropped on restore rather than shown. */
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The cache survives a restart, so a recipe already opened stays readable with no
 * network, per the Offline section of CLAUDE.md. Queries must keep their data at least
 * as long as the persister keeps the file, or a restore has nothing to restore.
 */
export function createPersister(): Persister {
  return createAsyncStoragePersister({ storage: Storage, key: 'panna.queries' });
}

export const persistOptions = { maxAge: CACHE_MAX_AGE_MS };

/**
 * TanStack Query decides what is stale by watching the browser's online and focus
 * events, neither of which exists here. Without this wiring it believes it is always
 * online and always focused, and the offline behaviour in CLAUDE.md silently does
 * nothing.
 */
export function wireQueryToDevice(): () => void {
  // The manager owns the teardown that this setup function returns.
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    }),
  );

  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  });

  return () => {
    subscription.remove();
  };
}

let shared: QueryClient | null = null;

/** The one client the app runs on, for code that is not a component (the cook queue, 0014). */
export function queryClient(): QueryClient {
  shared ??= createQueryClient();
  return shared;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A kitchen has bad wifi. Retrying once is useful; retrying four times just
        // delays telling the user something is wrong.
        retry: 1,
        staleTime: 30_000,
        gcTime: CACHE_MAX_AGE_MS,
        refetchOnReconnect: true,
      },
      // Offline, a mutation would otherwise pause and fire when the connection returns.
      // CLAUDE.md wants a write attempted offline to fail at once and keep the input,
      // with nothing silently pending, so it goes ahead and fails like any fetch.
      mutations: { retry: 0, networkMode: 'always' },
    },
  });
}
