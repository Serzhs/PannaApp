import { api, type EndpointName, type ResponseOf } from './contract.js';
import { ERROR_CODES } from './error-codes.js';
import { errorBodySchema, type ErrorBody } from './error.js';

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
  /** A multipart body, for uploads (0011). The runtime sets the content type and boundary. */
  readonly form?: FormData;
  /** Values for the `:name` segments of the endpoint's path. */
  readonly params?: Record<string, string>;
  /** The query string, encoded here so a caller never builds one by hand (0019). */
  readonly query?: Record<string, string>;
}

function withQuery(path: string, query: Record<string, string> | undefined): string {
  if (query === undefined) return path;
  const encoded = new URLSearchParams(query).toString();
  return encoded.length === 0 ? path : `${path}?${encoded}`;
}

/** Every `:name` in the path is replaced, and a missing value is a bug rather than a 404. */
export function fillPath(path: string, params: Record<string, string> = {}): string {
  return path.replace(/:([A-Za-z]+)/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Path ${path} needs a value for :${name}`);
    return encodeURIComponent(value);
  });
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
  const path = withQuery(fillPath(endpoint.path, options.params), options.query);
  const response = await fetch(`${options.baseUrl}${path}`, {
    method: endpoint.method,
    headers: {
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    ...(options.form === undefined ? {} : { body: options.form }),
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
