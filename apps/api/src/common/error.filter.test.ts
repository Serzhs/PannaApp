import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES, errorBodySchema } from '@panna/shared';
import { describe, expect, it, vi } from 'vitest';

import { AppException } from './app-exception.js';
import { ErrorFilter } from './error.filter.js';

function capture(exception: unknown): unknown {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as never;

  new ErrorFilter().catch(exception, host);
  return json.mock.calls[0]?.[0];
}

describe('the error filter', () => {
  it('gives every error a code the client can translate', () => {
    const body = capture(new AppException(HttpStatus.CONFLICT, ERROR_CODES.VALIDATION_FAILED, 'x'));
    expect(errorBodySchema.safeParse(body).success).toBe(true);
  });

  it('carries per-field codes, so a form can mark the right field without parsing English', () => {
    const body = capture(
      new AppException(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED, 'bad', {
        title: 'TOO_SHORT',
      }),
    );
    expect(body).toMatchObject({ code: 'VALIDATION_FAILED', fields: { title: 'TOO_SHORT' } });
  });

  it('maps a throttled request to RATE_LIMITED', () => {
    const body = capture(new HttpException('slow down', HttpStatus.TOO_MANY_REQUESTS));
    expect(body).toMatchObject({ statusCode: 429, code: ERROR_CODES.RATE_LIMITED });
  });

  it('tells the client nothing about an unexpected failure', () => {
    const body = capture(new Error('connect ECONNREFUSED 127.0.0.1:5433 at Socket.emit'));
    expect(body).toEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Something went wrong.',
      code: ERROR_CODES.INTERNAL,
    });
    expect(JSON.stringify(body)).not.toMatch(/ECONNREFUSED|Socket|5433/);
  });
});
