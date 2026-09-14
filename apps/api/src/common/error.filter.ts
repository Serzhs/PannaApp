import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ERROR_CODES, type ErrorBody } from '@panna/shared';
import type { Response } from 'express';

import { AppException } from './app-exception.js';

const TOO_MANY_REQUESTS: number = HttpStatus.TOO_MANY_REQUESTS;
const PAYLOAD_TOO_LARGE: number = HttpStatus.PAYLOAD_TOO_LARGE;

function hasNumericStatus(e: unknown): e is { status: number } {
  return (
    typeof e === 'object' && e !== null && typeof (e as { status?: unknown }).status === 'number'
  );
}

function isRateLimited(status: number): boolean {
  return status === TOO_MANY_REQUESTS;
}

/**
 * Every error leaves through here, so no endpoint can answer without a `code`, and no
 * stack trace, SQL fragment or internal path can reach a client.
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);

    if (body.statusCode >= 500) {
      // Anything unrecognised is a bug: log it in full, tell the client nothing.
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof AppException) {
      const status = exception.getStatus();
      return {
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        message: exception.message,
        code: exception.code,
        ...(exception.fields ? { fields: exception.fields } : {}),
      };
    }

    // body-parser rejects an oversized body before parsing it, but throws a plain
    // Error carrying a status rather than an HttpException.
    if (hasNumericStatus(exception) && exception.status === PAYLOAD_TOO_LARGE) {
      return {
        statusCode: PAYLOAD_TOO_LARGE,
        error: 'Payload Too Large',
        message: 'The request body is larger than this endpoint accepts.',
        code: ERROR_CODES.PAYLOAD_TOO_LARGE,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        message: exception.message,
        code: isRateLimited(status) ? ERROR_CODES.RATE_LIMITED : ERROR_CODES.INTERNAL,
      };
    }

    return {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Something went wrong.',
      code: ERROR_CODES.INTERNAL,
    };
  }
}
