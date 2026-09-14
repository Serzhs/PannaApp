import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

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

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A kitchen has bad wifi. Retrying once is useful; retrying four times just
        // delays telling the user something is wrong.
        retry: 1,
        staleTime: 30_000,
        refetchOnReconnect: true,
      },
      mutations: { retry: 0 },
    },
  });
}
