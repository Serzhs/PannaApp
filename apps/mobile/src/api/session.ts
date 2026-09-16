import { ApiError, type EndpointName, type RequestOptions, type ResponseOf } from '@panna/shared';

import { authorized, call } from './client';

export interface Tokens {
  readonly accessToken: string;
  readonly refreshToken: string;
}

type Listener = (tokens: Tokens | null) => void;

let current: Tokens | null = null;
let refreshing: Promise<Tokens> | null = null;
const listeners = new Set<Listener>();

function publish(next: Tokens | null): void {
  current = next;
  for (const listener of listeners) listener(next);
}

/** Called by the auth provider when a session starts, is restored, or ends. */
export function setTokens(tokens: Tokens | null): void {
  current = tokens;
}

/**
 * Fires with new tokens after a refresh, so they can be written to the keychain, and
 * with null when a refresh fails, which is the signal to return to sign-in.
 */
export function onTokensChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * One refresh at a time. Every 401 that lands while it is in flight waits on the same
 * promise, so a screen firing three requests with an expired token causes one call to
 * refresh, not three - and not three revocations of each other's chain.
 */
function refreshOnce(): Promise<Tokens> {
  refreshing ??= (async () => {
    if (current === null) throw new Error('No session to refresh');
    try {
      const fresh = await call('refresh', { body: { refreshToken: current.refreshToken } });
      publish(fresh);
      return fresh;
    } catch (error) {
      // The refresh token is gone, expired or revoked: the session is over either way.
      if (error instanceof ApiError) publish(null);
      throw error;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * The only way to call an endpoint that needs a signed-in user. Attaches the access
 * token, and on a 401 refreshes once and retries once, per 0003.
 */
export async function authorizedCall<K extends EndpointName>(
  name: K,
  options: Omit<RequestOptions, 'baseUrl' | 'headers'> = {},
): Promise<ResponseOf<K>> {
  if (current === null) throw new Error('Not signed in');
  try {
    return await call(name, { ...options, headers: authorized(current.accessToken) });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const fresh = await refreshOnce();
    return call(name, { ...options, headers: authorized(fresh.accessToken) });
  }
}
