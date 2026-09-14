import { config } from 'dotenv';
import { eq } from 'drizzle-orm';

import { createDatabase } from './client.js';
import { recipes, users } from './schema/index.js';

config({ path: '../../.env' });

/**
 * Known rows for working on the app by hand. Idempotent, so running it twice leaves
 * the same rows rather than duplicating them. Automated tests never call this: they
 * build the exact state they need.
 */
const SEED_USERS = [
  { email: 'janis@example.com', displayName: 'Jānis' },
  { email: 'anna@example.com', displayName: 'Anna' },
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');

  const { sql, db } = createDatabase(url, 2);

  for (const seed of SEED_USERS) {
    const existing = await db.select().from(users).where(eq(users.email, seed.email)).limit(1);
    if (existing.length > 0) {
      console.log(`${seed.email} already there`);
      continue;
    }
    const [user] = await db.insert(users).values(seed).returning();
    if (!user) throw new Error('insert returned nothing');
    console.log(`created ${seed.email}`);

    // One recipe each, so the list screen has something in it from 0005 onward.
    await db.insert(recipes).values({
      authorId: user.id,
      title: seed.displayName === 'Anna' ? "Grandmother's rye bread" : 'Cold beetroot soup',
      servings: seed.displayName === 'Anna' ? 1 : 4,
      status: 'ready',
    });
  }

  await sql.end();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
