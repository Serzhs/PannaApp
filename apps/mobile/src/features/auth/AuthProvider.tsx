import type { Session, SessionUser } from '@panna/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { logout as logoutRequest } from './auth.api';
import {
  clearSession,
  loadSession,
  saveSession,
  saveTokens,
  saveUser,
  type StoredSession,
} from './session.store';

import { onTokensChanged, setTokens } from '@/api/session';

interface AuthState {
  /** Null once the check has run and found nothing; undefined while it is still running. */
  readonly session: StoredSession | null | undefined;
  readonly user: SessionUser | null;
  readonly signIn: (session: Session) => Promise<void>;
  readonly signOut: () => Promise<void>;
  /** After PATCH /api/me: what the server now holds for this person. */
  readonly updateUser: (user: SessionUser) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null | undefined>(undefined);

  // Reading the keychain is async, so the app starts in "not known yet" rather than in
  // "signed out" - otherwise every cold start flashes the sign-in screen.
  useEffect(() => {
    let cancelled = false;
    void loadSession().then((stored) => {
      if (cancelled) return;
      setTokens(stored);
      setSession(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The API layer refreshes tokens on its own; this is where the outcome lands. New
  // tokens go to the keychain, and a failed refresh ends the session, which sends the
  // router back to sign-in.
  useEffect(
    () =>
      onTokensChanged((tokens) => {
        if (tokens === null) {
          setSession(null);
          void clearSession();
          return;
        }
        void saveTokens(tokens);
        setSession((previous) =>
          previous === null || previous === undefined ? previous : { ...previous, ...tokens },
        );
      }),
    [],
  );

  const signIn = useCallback(async (next: Session) => {
    await saveSession(next);
    const stored = {
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      user: next.user,
    };
    setTokens(stored);
    setSession(stored);
  }, []);

  const signOut = useCallback(async () => {
    const current = session;
    setTokens(null);
    setSession(null);
    await clearSession();
    // Best effort: the local session is already gone, so a failure here must not strand
    // the user on a screen they cannot leave.
    if (current) {
      await logoutRequest(current.accessToken, current.refreshToken).catch(() => undefined);
    }
  }, [session]);

  const updateUser = useCallback(async (user: SessionUser) => {
    setSession((previous) =>
      previous === null || previous === undefined ? previous : { ...previous, user },
    );
    await saveUser(user);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, user: session?.user ?? null, signIn, signOut, updateUser }),
    [session, signIn, signOut, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
