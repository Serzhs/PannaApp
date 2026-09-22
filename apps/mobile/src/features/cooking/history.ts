import { ApiError } from '@panna/shared';
import { onlineManager } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import Storage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';

import type { CookRecord } from './store';

import { authorizedCall } from '@/api/session';
import { recipeKeys } from '@/features/recipes/queries';
import { queryClient } from '@/query/client';

const KEY = 'panna.cookQueue';

export interface QueuedCook {
  readonly id: string;
  readonly recipeId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly excluded: readonly string[];
}

function readQueue(): QueuedCook[] {
  const raw = Storage.getItemSync(KEY);
  if (raw === null) return [];
  try {
    return JSON.parse(raw) as QueuedCook[];
  } catch {
    return [];
  }
}

function writeQueue(queue: readonly QueuedCook[]): void {
  if (queue.length === 0) Storage.removeItemSync(KEY);
  else Storage.setItemSync(KEY, JSON.stringify(queue));
}

export function queuedCooks(recipeId?: string): QueuedCook[] {
  const queue = readQueue();
  return recipeId === undefined ? queue : queue.filter((cook) => cook.recipeId === recipeId);
}

/**
 * A finished cook goes to the device first (0014): cooking ends where a connection is
 * least likely, and the row cannot be recreated by asking the user to try again. The
 * id is made here so a send whose answer was lost can be repeated without a second row.
 */
export function queueFinishedCook(record: CookRecord, now: number = Date.now()): QueuedCook {
  const names = record.recipe.ingredients
    .filter((line) => record.excluded.includes(line.id))
    .map((line) => line.name);
  const cook: QueuedCook = {
    id: Crypto.randomUUID(),
    recipeId: record.recipe.id,
    startedAt: record.startedAt,
    finishedAt: new Date(now).toISOString(),
    excluded: names,
  };
  writeQueue([...readQueue(), cook]);
  void flushCookQueue();
  return cook;
}

let flushing: Promise<void> | null = null;

async function drain(): Promise<void> {
  for (const cook of readQueue()) {
    if (!onlineManager.isOnline()) return;
    try {
      await authorizedCall('recordCook', {
        params: { recipeId: cook.recipeId },
        body: {
          id: cook.id,
          startedAt: cook.startedAt,
          finishedAt: cook.finishedAt,
          excluded: [...cook.excluded],
        },
      });
    } catch (error: unknown) {
      // A recipe that is gone, or a body the server will never take, can never be sent: drop it.
      // Everything else, no server, no session, a rate limit, stays queued for next time.
      if (
        error instanceof ApiError &&
        error.status !== 401 &&
        error.status !== 429 &&
        error.status < 500
      ) {
        writeQueue(readQueue().filter((queued) => queued.id !== cook.id));
        continue;
      }
      return;
    }
    writeQueue(readQueue().filter((queued) => queued.id !== cook.id));
    await queryClient().invalidateQueries({ queryKey: recipeKeys.detail(cook.recipeId) });
  }
}

/** Sends what is queued, oldest first, and stops at the first failure to try again later. One at a time. */
export function flushCookQueue(): Promise<void> {
  if (flushing !== null) return flushing;
  const run = drain().finally(() => {
    // Compared, not just cleared: a drain that finished before this line ran must not null a newer one.
    if (flushing === run) flushing = null;
  });
  flushing = run;
  return run;
}

/** Tries the queue whenever the connection returns or the app comes back to the front. */
export function watchCookQueue(): () => void {
  const unsubscribe = onlineManager.subscribe((online) => {
    if (online) void flushCookQueue();
  });
  const subscription = AppState.addEventListener('change', (status) => {
    if (status === 'active') void flushCookQueue();
  });
  void flushCookQueue();
  return () => {
    unsubscribe();
    subscription.remove();
  };
}
