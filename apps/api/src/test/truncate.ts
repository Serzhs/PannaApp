import { sql } from 'drizzle-orm';

import type { Database } from '../db/client';

/**
 * Tests isolate by truncating, not by wrapping each test in a transaction that is
 * rolled back. Rolling back is faster, but service code already runs inside
 * transactions, so those would become savepoints nested under the test's and no test
 * would ever exercise a real commit. Since a partial write is a bug here, the tests
 * have to be able to catch one.
 */
export async function truncateAll(db: Database): Promise<void> {
  await db.execute(sql`
    truncate table
      cook_notes, cooks,
      step_equipment, step_ingredients, steps,
      equipment, ingredients, recipes,
      refresh_tokens, identities, users
    restart identity cascade
  `);
}
