import { z } from 'zod';

import {
  devSignInBodySchema,
  refreshBodySchema,
  sessionSchema,
  sessionUserSchema,
  signInBodySchema,
  tokenPairSchema,
} from './auth.js';

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
  signIn: endpoint({
    method: 'POST',
    path: '/api/auth/session',
    response: sessionSchema,
    body: signInBodySchema,
  }),
  /**
   * Development only. The server does not register this route unless NODE_ENV is not
   * production and ALLOW_DEV_SIGN_IN is true, so in a real deployment it is a 404 with
   * no handler behind it. It stays in the contract because the client is typed from
   * here either way, and a route that exists in one build and not another would
   * otherwise be described twice.
   */
  devSignIn: endpoint({
    method: 'POST',
    path: '/api/auth/dev-session',
    response: sessionSchema,
    body: devSignInBodySchema,
  }),
  refresh: endpoint({
    method: 'POST',
    path: '/api/auth/refresh',
    response: tokenPairSchema,
    body: refreshBodySchema,
  }),
  logout: endpoint({
    method: 'POST',
    path: '/api/auth/logout',
    response: z.void(),
    body: refreshBodySchema,
  }),
  me: endpoint({
    method: 'GET',
    path: '/api/me',
    response: sessionUserSchema,
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
