import { ApiError } from '@panna/shared';

import { authorizedCall, onTokensChanged, setTokens } from './session';

interface Stub {
  readonly status: number;
  readonly body: unknown;
}

const RECIPE = {
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  title: 'Soup',
  description: null,
  status: 'draft',
  coverImageKey: null,
  servings: 2,
  totalTimeMinutes: null,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
  ingredients: [],
  equipment: [],
  steps: [],
};

const EXPIRED: Stub = {
  status: 401,
  body: {
    statusCode: 401,
    error: 'Unauthorized',
    message: 'Access token has expired',
    code: 'AUTH_TOKEN_EXPIRED',
  },
};
const REVOKED: Stub = {
  status: 401,
  body: { statusCode: 401, error: 'Unauthorized', message: 'Revoked', code: 'AUTH_TOKEN_REVOKED' },
};
const FRESH: Stub = { status: 200, body: { accessToken: 'access-2', refreshToken: 'refresh-2' } };

/** The list answers with an array and the detail with one recipe, as the contract says. */
function ok(url: string): Stub {
  return { status: 200, body: url.endsWith('/api/recipes') ? [RECIPE] : RECIPE };
}

/** Answers by path so the order requests arrive in does not matter. */
function stubFetch(script: (url: string, auth: string | undefined) => Stub) {
  const fetchMock = jest.fn((url: string, init?: RequestInit) => {
    const headers = init?.headers as Record<string, string> | undefined;
    const { status, body } = script(url, headers?.authorization);
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: 'stub',
      json: () => Promise.resolve(body),
    } as Response);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const calls = (fetchMock: jest.Mock, path: string) =>
  fetchMock.mock.calls.filter(([url]) => String(url).endsWith(path)).length;

describe('authorizedCall', () => {
  beforeEach(() => {
    setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  });

  it('attaches the access token', async () => {
    const fetchMock = stubFetch((url) => ok(url));
    await authorizedCall('listRecipes');
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer access-1');
  });

  /** The criterion: two requests together with an expired token, one refresh. */
  it('refreshes exactly once for concurrent 401s, then retries each with the new token', async () => {
    const fetchMock = stubFetch((url, auth) => {
      if (url.endsWith('/auth/refresh')) return FRESH;
      return auth === 'Bearer access-2' ? ok(url) : EXPIRED;
    });
    const changed = jest.fn();
    onTokensChanged(changed);

    await Promise.all([
      authorizedCall('getRecipe', { params: { recipeId: RECIPE.id } }),
      authorizedCall('listRecipes'),
    ]);

    expect(calls(fetchMock, '/auth/refresh')).toBe(1);
    expect(changed).toHaveBeenCalledWith({ accessToken: 'access-2', refreshToken: 'refresh-2' });
  });

  it('gives up and ends the session when the refresh itself is refused', async () => {
    stubFetch((url) => (url.endsWith('/auth/refresh') ? REVOKED : EXPIRED));
    const changed = jest.fn();
    onTokensChanged(changed);

    await expect(authorizedCall('listRecipes')).rejects.toBeInstanceOf(ApiError);
    expect(changed).toHaveBeenCalledWith(null);
  });

  it('does not refresh for errors that are not a 401', async () => {
    const fetchMock = stubFetch(() => ({
      status: 404,
      body: { statusCode: 404, error: 'Not Found', message: 'no', code: 'RECIPE_NOT_FOUND' },
    }));
    await expect(
      authorizedCall('getRecipe', { params: { recipeId: RECIPE.id } }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(calls(fetchMock, '/auth/refresh')).toBe(0);
  });

  it('refuses to call anything while signed out', async () => {
    setTokens(null);
    await expect(authorizedCall('listRecipes')).rejects.toThrow('Not signed in');
  });
});
