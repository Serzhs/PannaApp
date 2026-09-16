import type { Session } from '@panna/shared';
import * as SecureStore from 'expo-secure-store';

/**
 * Tokens go in the keychain rather than in async storage, because async storage is a
 * plain file that anything with filesystem access can read.
 */
const ACCESS_KEY = 'panna.accessToken';
const REFRESH_KEY = 'panna.refreshToken';
const USER_KEY = 'panna.user';

export interface StoredSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: Session['user'];
}

export async function saveSession(session: Session): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, session.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user)),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

export async function loadSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken, rawUser] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);

  if (accessToken === null || refreshToken === null || rawUser === null) return null;

  try {
    // Written by us, but it survives app upgrades, so a shape change must not crash the
    // app on launch - a session that will not parse is treated as no session.
    const user = JSON.parse(rawUser) as Session['user'];
    return { accessToken, refreshToken, user };
  } catch {
    return null;
  }
}
