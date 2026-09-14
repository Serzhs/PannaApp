import { api, type EndpointName, type ResponseOf } from './contract';
import { errorBodySchema, type ErrorBody } from './error';
import { ERROR_CODES } from './error-codes';

/** Carries the machine `code`, which is what the app translates. */
export class ApiError extends Error {
  constructor(
    readonly body: ErrorBody,
    readonly status: number,
  ) {
    super(body.message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  readonly baseUrl: string;
  readonly signal?: AbortSignal;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
}

/**
 * Types disappear when the code runs, so a type alone only proves what the server
 * *should* send. Parsing proves what it did send, and turns a silent wrong-shape bug
 * into an obvious error at the boundary.
 */
export async function request<K extends EndpointName>(
  name: K,
  options: RequestOptions,
): Promise<ResponseOf<K>> {
  const endpoint = api[name];
  const response = await fetch(`${options.baseUrl}${endpoint.path}`, {
    method: endpoint.method,
    headers: {
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsed = errorBodySchema.safeParse(payload);
    throw new ApiError(
      parsed.success
        ? parsed.data
        : {
            statusCode: response.status,
            error: response.statusText,
            message: 'The server returned an error in an unexpected shape.',
            code: ERROR_CODES.INTERNAL,
          },
      response.status,
    );
  }

  return endpoint.response.parse(payload);
}
