import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  database: z.literal('ok'),
});

export interface Endpoint<TResponse extends z.ZodTypeAny, TBody extends z.ZodTypeAny = z.ZodNever> {
  readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  readonly path: string;
  readonly response: TResponse;
  readonly body?: TBody;
}

/** Identity, but it infers each endpoint's schemas instead of widening them. */
function endpoint<TResponse extends z.ZodTypeAny, TBody extends z.ZodTypeAny = z.ZodNever>(
  e: Endpoint<TResponse, TBody>,
): Endpoint<TResponse, TBody> {
  return e;
}

/**
 * Every endpoint is described once, here. The controller's return type is derived from
 * it, so it will not compile if it answers with the wrong shape, and the mobile client
 * parses against the same schema, so neither side can drift from the other.
 */
export const api = {
  health: endpoint({
    method: 'GET',
    path: '/api/health',
    response: healthResponseSchema,
  }),
} as const;

export type Api = typeof api;
export type EndpointName = keyof Api;

/** Mounted once on the server; the client uses the full paths above. */
export const API_PREFIX = 'api';

/**
 * The path a Nest controller declares, which is the contract path without the prefix
 * the server mounts globally. Derived so the two can never disagree.
 */
export function nestPath(name: EndpointName): string {
  return api[name].path.slice(API_PREFIX.length + 1);
}

export type ResponseOf<K extends EndpointName> = z.infer<Api[K]['response']>;
