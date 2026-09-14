import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, request } from './client';
import { ERROR_CODES } from './error-codes';

function respondWith(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText: 'Stubbed',
        json: () => Promise.resolve(body),
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the shared client', () => {
  it('returns a response that matches the contract', async () => {
    respondWith({ status: 'ok', database: 'ok' });
    await expect(request('health', { baseUrl: 'http://x' })).resolves.toEqual({
      status: 'ok',
      database: 'ok',
    });
  });

  // Types vanish when the code runs, so a type alone only proves what the server
  // *should* send. This is the half that proves what it did send.
  it('rejects a 200 whose shape is wrong, rather than passing it on', async () => {
    respondWith({ status: 'fine', database: 42 });
    await expect(request('health', { baseUrl: 'http://x' })).rejects.toThrow();
  });

  it('rejects a 200 that is missing a field', async () => {
    respondWith({ status: 'ok' });
    await expect(request('health', { baseUrl: 'http://x' })).rejects.toThrow();
  });

  it('turns an error body into an ApiError carrying the code', async () => {
    respondWith(
      {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'slow down',
        code: ERROR_CODES.RATE_LIMITED,
      },
      429,
    );
    await expect(request('health', { baseUrl: 'http://x' })).rejects.toMatchObject({
      status: 429,
      body: { code: ERROR_CODES.RATE_LIMITED },
    });
  });

  it('still gives an ApiError when the server errors in an unexpected shape', async () => {
    respondWith('<html>502 Bad Gateway</html>', 502);
    const error = await request('health', { baseUrl: 'http://x' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).body.code).toBe(ERROR_CODES.INTERNAL);
  });

  it('calls the path from the contract, so the two cannot disagree', async () => {
    respondWith({ status: 'ok', database: 'ok' });
    await request('health', { baseUrl: 'http://api.test' });
    expect(fetch).toHaveBeenCalledWith('http://api.test/api/health', expect.anything());
  });
});
