import { HttpException, type HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@panna/shared';

/** Thrown anywhere in the app to attach a stable machine code to an HTTP error. */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message, status);
  }
}
