import { request, type ResponseOf } from '@panna/shared';
import Constants from 'expo-constants';

/**
 * A simulator cannot reach the host's localhost, so the address comes from the Expo
 * dev server's own host. `EXPO_PUBLIC_API_URL` overrides it for a device.
 */
function baseUrl(): string {
  // Expo types EXPO_PUBLIC_* as any, so read it as unknown and narrow.
  const explicit: unknown = process.env.EXPO_PUBLIC_API_URL;
  if (typeof explicit === 'string' && explicit.length > 0) return explicit;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

export async function checkHealth(): Promise<ResponseOf<'health'>> {
  return request('health', { baseUrl: baseUrl() });
}
