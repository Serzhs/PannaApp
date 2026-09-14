import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { errorBodySchema } from './error';

const c = initContract();

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  database: z.literal('ok'),
});

/**
 * Every endpoint is described once, here. The controller will not compile if it does
 * not match, and the mobile client is built from the same object, so neither side can
 * drift from the other.
 */
export const contract = c.router(
  {
    health: {
      method: 'GET',
      path: '/health',
      responses: {
        200: healthResponseSchema,
        503: errorBodySchema,
      },
      summary: 'Liveness, including a trivial query against the database.',
    },
  },
  {
    pathPrefix: '/api',
    commonResponses: {
      400: errorBodySchema,
      429: errorBodySchema,
      500: errorBodySchema,
    },
  },
);
