import { z } from 'zod';

import { ERROR_CODES } from './error-codes.js';

/**
 * `message` is English and exists for logs and developers. The client renders `code`,
 * which is why rewording a message can never break a client.
 */
export const errorBodySchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  code: z.nativeEnum(ERROR_CODES),
  /** Present only on VALIDATION_FAILED: field name to a per-field code. */
  fields: z.record(z.string()).optional(),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;
