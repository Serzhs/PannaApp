import { Controller, Inject, Logger } from '@nestjs/common';
import { contract, ERROR_CODES } from '@panna/shared';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { sql } from 'drizzle-orm';

import type { Database } from '../../db/client';
import { DATABASE } from '../../db/database.module';

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @TsRestHandler(contract.health)
  health() {
    return tsRestHandler(contract.health, async () => {
      try {
        // A trivial query, so an unreachable database fails here rather than on the
        // first real request.
        await this.db.execute(sql`select 1`);
      } catch (error: unknown) {
        this.logger.error(error instanceof Error ? error.message : String(error));
        // Unavailable, not broken: the service is fine, its database is not.
        return {
          status: 503 as const,
          body: {
            statusCode: 503,
            error: 'Service Unavailable',
            message: 'The database is not reachable.',
            code: ERROR_CODES.INTERNAL,
          },
        };
      }
      return { status: 200 as const, body: { status: 'ok' as const, database: 'ok' as const } };
    });
  }
}
