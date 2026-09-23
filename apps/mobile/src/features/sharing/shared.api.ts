import { request, type SharedRecipe } from '@panna/shared';

/**
 * Reads a shared recipe from wherever the link says the API is (0017): the reader's
 * own API may be a different machine from the author's. No session, no headers.
 */
export async function getShared(apiUrl: string, token: string): Promise<SharedRecipe> {
  return request('getShared', { baseUrl: apiUrl, params: { token } });
}
