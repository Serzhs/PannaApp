import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/** The same online signal TanStack Query acts on, so a screen and its queries never disagree. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}
