import { afterAll, afterEach, beforeAll } from 'vitest';

import { createDatabase } from '../db/client.js';

import { truncateAll } from './truncate.js';

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error('DATABASE_URL is not set. Run `pnpm db:up` and copy .env.example to .env.');

const { sql, db } = createDatabase(url, 2);

// Before as well as after: the dev seed, or a file that was killed mid-test, leaves rows
// that the first test would otherwise start on top of.
beforeAll(async () => {
  await truncateAll(db);
});

afterEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await sql.end();
});

export { db };
