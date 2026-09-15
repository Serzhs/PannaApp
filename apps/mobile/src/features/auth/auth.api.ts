import type { Session } from '@panna/shared';

import { authorized, call } from '@/api/client';

export async function devSignIn(email: string): Promise<Session> {
  return call('devSignIn', { body: { email } });
}

export async function refreshSession(refreshToken: string) {
  return call('refresh', { body: { refreshToken } });
}

export async function logout(accessToken: string, refreshToken: string): Promise<void> {
  await call('logout', { body: { refreshToken }, headers: authorized(accessToken) });
}

export async function fetchMe(accessToken: string) {
  return call('me', { headers: authorized(accessToken) });
}
