import { Injectable, type PipeTransform } from '@nestjs/common';
import { ERROR_CODES } from '@panna/shared';
import type { ZodType } from 'zod';

import { AppException } from './app-exception.js';

/**
 * Parses a request body with a schema from `packages/shared`, so the API validates with
 * exactly what the mobile form validates with. Schemas are strict, so an unknown field
 * is a 400 rather than something quietly dropped - silently ignoring an unexpected
 * `authorId` is how mass assignment bugs survive review.
 */
@Injectable()
export class ZodBody<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (parsed.success) return parsed.data;

    // Keyed by field so a form can say which input is wrong, in the user's language.
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '(body)';
      fields[key] ??= issue.code.toUpperCase();
    }

    throw new AppException(400, ERROR_CODES.VALIDATION_FAILED, 'Request body is not valid', fields);
  }
}
