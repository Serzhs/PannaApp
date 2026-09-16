import { createContext, useContext } from 'react';

export interface ScrollLock {
  readonly lock: () => void;
  readonly unlock: () => void;
}

/** Outside a scrolling Screen there is nothing to lock, so the default does nothing. */
export const ScrollLockContext = createContext<ScrollLock>({
  lock: () => undefined,
  unlock: () => undefined,
});

export function useScrollLock(): ScrollLock {
  return useContext(ScrollLockContext);
}
