import { request, type EndpointName, type RequestOptions, type ResponseOf } from '@panna/shared';
import Constants from 'expo-constants';

/**
 * A simulator cannot reach the host's localhost, so the address comes from the Expo dev
 * server's own host. `EXPO_PUBLIC_API_URL` overrides it for a real device.
 */
export function baseUrl(): string {
  // Expo types EXPO_PUBLIC_* as any, so read it as unknown and narrow.
  const explicit: unknown = process.env.EXPO_PUBLIC_API_URL;
  if (typeof explicit === 'string' && explicit.length > 0) return explicit;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

export async function call<K extends EndpointName>(
  name: K,
  options: Omit<RequestOptions, 'baseUrl'> = {},
): Promise<ResponseOf<K>> {
  return request(name, { ...options, baseUrl: baseUrl() });
}

export function authorized(accessToken: string): Record<string, string> {
  return { authorization: `Bearer ${accessToken}` };
}
