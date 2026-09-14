import { afterAll, afterEach } from 'vitest';

import { createDatabase } from '../db/client.js';

import { truncateAll } from './truncate.js';

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error('DATABASE_URL is not set. Run `pnpm db:up` and copy .env.example to .env.');

const { sql, db } = createDatabase(url, 2);

afterEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await sql.end();
});

export { db };
