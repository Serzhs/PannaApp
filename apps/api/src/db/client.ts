import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export function createDatabase(url: string, max = 10) {
  const sql = postgres(url, { max });
  const db = drizzle(sql, { schema, casing: 'snake_case' });
  return { sql, db };
}

export type Database = ReturnType<typeof createDatabase>['db'];
