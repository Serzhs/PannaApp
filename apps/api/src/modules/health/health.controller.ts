import { Controller, Get, HttpCode, Logger, Res } from '@nestjs/common';
import { ERROR_CODES, nestPath, type ErrorBody, type ResponseOf } from '@panna/shared';
import { sql } from 'drizzle-orm';
import type { Response } from 'express';

import { DatabaseService } from '../../db/database.service';

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * The return type comes from the shared contract, so this will not compile if it
   * answers with a shape the client does not expect.
   */
  @Get(nestPath('health'))
  @HttpCode(200)
  async health(
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResponseOf<'health'> | ErrorBody> {
    try {
      // A trivial query, so an unreachable database fails here rather than on the
      // first real request.
      await this.database.db.execute(sql`select 1`);
    } catch (error: unknown) {
      this.logger.error(error instanceof Error ? error.message : String(error));
      res.status(503);
      // Unavailable, not broken: the service is fine, its database is not.
      return {
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'The database is not reachable.',
        code: ERROR_CODES.INTERNAL,
      };
    }
    return { status: 'ok', database: 'ok' };
  }
}
