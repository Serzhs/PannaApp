import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { config } from 'dotenv';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';

import { createDatabase, type Database } from './client.js';
import {
  cookNotes,
  cooks,
  equipment,
  ingredients,
  recipes,
  stepEquipment,
  stepIngredients,
  steps,
  users,
} from './schema/index.js';

config({ path: '../../.env' });

/**
 * Known rows for working on the app by hand. Idempotent, so running it twice leaves
 * the same rows rather than duplicating them. Automated tests never call this: they
 * build the exact state they need.
 */
const SEED_USERS = [
  { email: 'janis@example.com', displayName: 'Jānis' },
  { email: 'anna@example.com', displayName: 'Anna' },
] as const;

const IMAGE_DIR = process.env.IMAGE_DIR ?? join(homedir(), '.panna', 'images');

/** A flat colour stands in for a photo: enough to see where a picture goes. */
async function seedImage(key: string, colour: string, wide: boolean): Promise<string> {
  await mkdir(IMAGE_DIR, { recursive: true });
  const bytes = await sharp({
    create: {
      width: wide ? 1600 : 1200,
      height: wide ? 1200 : 1200,
      channels: 3,
      background: colour,
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  await writeFile(join(IMAGE_DIR, `${key}.jpg`), bytes);
  return key;
}

async function ensureUser(
  db: Database,
  seed: { readonly email: string; readonly displayName: string },
): Promise<string> {
  const [existing] = await db.select().from(users).where(eq(users.email, seed.email)).limit(1);
  if (existing !== undefined) {
    console.log(`${seed.email} already there`);
    return existing.id;
  }
  const [user] = await db.insert(users).values(seed).returning();
  if (!user) throw new Error('insert returned nothing');
  console.log(`created ${seed.email}`);
  return user.id;
}

/**
 * True when the recipe is already there. A bare row of that title with no steps, left by an
 * older seed, is replaced so the full one can take its place; this is development data.
 */
async function hasRecipe(db: Database, authorId: string, title: string): Promise<boolean> {
  const rows = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.authorId, authorId), eq(recipes.title, title)))
    .limit(1);
  const found = rows[0];
  if (found === undefined) return false;
  const stepRows = await db
    .select({ id: steps.id })
    .from(steps)
    .where(eq(steps.recipeId, found.id));
  if (stepRows.length > 0) return true;
  await db.delete(recipes).where(eq(recipes.id, found.id));
  return false;
}

/** Everything a recipe can carry, so every screen has something to show (0015). */
async function seedBeetrootSoup(db: Database, authorId: string): Promise<void> {
  const title = 'Cold beetroot soup';
  if (await hasRecipe(db, authorId, title)) return;

  const cover = await seedImage('a1b2c3d4e5f60718293a4b5c6d7e8f90', '#a8324b', true);
  const stepPhoto = await seedImage('0f1e2d3c4b5a69788796a5b4c3d2e1f0', '#d98c3f', false);

  const [recipe] = await db
    .insert(recipes)
    .values({
      authorId,
      title,
      description:
        'Latvian aukstā zupa: pink, sharp and cold. Best made the evening before and eaten on the first hot day of the year.',
      servings: 4,
      status: 'ready',
      totalTimeMinutes: 65,
      coverImageKey: cover,
    })
    .returning();
  if (!recipe) throw new Error('insert returned nothing');

  const lines = await db
    .insert(ingredients)
    .values([
      {
        recipeId: recipe.id,
        position: 0,
        name: 'beetroot',
        amount: '500',
        unit: 'g',
        note: 'raw, with the leaves cut off',
      },
      { recipeId: recipe.id, position: 1, name: 'kefir', amount: '1', unit: 'l', note: 'cold' },
      { recipeId: recipe.id, position: 2, name: 'cucumber', amount: '1', unit: null, note: null },
      { recipeId: recipe.id, position: 3, name: 'eggs', amount: '2', unit: 'piece', note: null },
      {
        recipeId: recipe.id,
        position: 4,
        name: 'dill',
        amount: '1',
        unit: null,
        note: 'a big bunch',
      },
      {
        recipeId: recipe.id,
        position: 5,
        name: 'spring onions',
        amount: '3',
        unit: null,
        note: null,
      },
      {
        recipeId: recipe.id,
        position: 6,
        name: 'salt',
        amount: null,
        unit: null,
        note: 'to taste',
      },
    ])
    .returning();
  const by = (name: string) => {
    const line = lines.find((l) => l.name === name);
    if (line === undefined) throw new Error(`no ingredient ${name}`);
    return line.id;
  };
  const tools = await db
    .insert(equipment)
    .values([
      { recipeId: recipe.id, position: 0, name: 'large pot', note: null, optional: false },
      {
        recipeId: recipe.id,
        position: 1,
        name: 'box grater',
        note: 'the coarse side',
        optional: false,
      },
      {
        recipeId: recipe.id,
        position: 2,
        name: 'blender',
        note: 'for a smoother soup',
        optional: true,
      },
    ])
    .returning();
  const tool = (name: string) => {
    const line = tools.find((l) => l.name === name);
    if (line === undefined) throw new Error(`no equipment ${name}`);
    return line.id;
  };

  const main = async (
    position: number,
    body: string,
    extra: { note?: string; durationSeconds?: number; imageKey?: string; parentStepId?: string },
  ) => {
    const [row] = await db
      .insert(steps)
      .values({
        recipeId: recipe.id,
        position,
        body,
        note: extra.note ?? null,
        durationSeconds: extra.durationSeconds ?? null,
        imageKey: extra.imageKey ?? null,
        parentStepId: extra.parentStepId ?? null,
      })
      .returning();
    if (!row) throw new Error('insert returned nothing');
    return row.id;
  };
  const link = async (stepId: string, ingredientIds: string[], equipmentIds: string[] = []) => {
    if (ingredientIds.length > 0) {
      await db
        .insert(stepIngredients)
        .values(ingredientIds.map((ingredientId) => ({ stepId, ingredientId })));
    }
    if (equipmentIds.length > 0) {
      await db
        .insert(stepEquipment)
        .values(equipmentIds.map((equipmentId) => ({ stepId, equipmentId })));
    }
  };

  const boil = await main(0, 'Boil the beetroot whole until a knife slides in easily', {
    note: 'Do not peel it first: the skin comes off with your thumbs once it has cooled.',
    durationSeconds: 45 * 60,
  });
  await link(boil, [by('beetroot')], [tool('large pot')]);
  const eggs = await main(0, 'Boil the eggs hard, then cool them in cold water', {
    durationSeconds: 9 * 60,
    parentStepId: boil,
  });
  await link(eggs, [by('eggs')]);
  const chop = await main(1, 'Chop the cucumber, dill and spring onions finely', {
    parentStepId: boil,
  });
  await link(chop, [by('cucumber'), by('dill'), by('spring onions')]);

  const grate = await main(1, 'Peel the cooled beetroot and grate it coarsely', {
    note: 'Wear an apron. Beetroot does not come out.',
    imageKey: stepPhoto,
  });
  await link(grate, [by('beetroot')], [tool('box grater')]);

  const mix = await main(
    2,
    'Stir the beetroot and everything chopped into the kefir, and salt it',
    {
      note: 'It should taste slightly too salty now: chilling dulls it.',
    },
  );
  await link(mix, [by('kefir'), by('salt')], [tool('blender')]);

  const chill = await main(3, 'Chill for at least an hour, overnight if you can', {
    durationSeconds: 60 * 60,
  });
  await link(chill, []);

  const serve = await main(4, 'Serve cold, with a halved egg on each bowl', {});
  await link(serve, [by('eggs')]);

  const [made] = await db
    .insert(cooks)
    .values([
      {
        recipeId: recipe.id,
        startedAt: new Date('2026-08-30T16:00:00Z'),
        finishedAt: new Date('2026-08-30T17:10:00Z'),
        excluded: [],
      },
      {
        recipeId: recipe.id,
        startedAt: new Date('2026-09-14T15:30:00Z'),
        finishedAt: new Date('2026-09-14T16:40:00Z'),
        excluded: ['spring onions'],
      },
    ])
    .returning();
  await db.insert(cookNotes).values([
    {
      recipeId: recipe.id,
      stepId: null,
      cookId: made?.id ?? null,
      body: 'Half a lemon squeezed in at the end made it brighter. Do that again.',
    },
    {
      recipeId: recipe.id,
      stepId: boil,
      cookId: null,
      body: 'Small beetroots were done in 35 minutes, not 45.',
    },
  ]);
  console.log(`seeded ${title}`);
}

async function seedPlov(db: Database, authorId: string): Promise<void> {
  const title = 'Plov';
  if (await hasRecipe(db, authorId, title)) return;
  const [recipe] = await db
    .insert(recipes)
    .values({
      authorId,
      title,
      description: 'Still working this one out.',
      servings: 6,
      status: 'draft',
    })
    .returning();
  if (!recipe) throw new Error('insert returned nothing');
  await db.insert(ingredients).values([
    {
      recipeId: recipe.id,
      position: 0,
      name: 'rice',
      amount: '500',
      unit: 'g',
      note: 'basmati, if you can',
    },
    {
      recipeId: recipe.id,
      position: 1,
      name: 'lamb shoulder',
      amount: '600',
      unit: 'g',
      note: null,
    },
    {
      recipeId: recipe.id,
      position: 2,
      name: 'carrots',
      amount: '4',
      unit: null,
      note: 'cut into matchsticks',
    },
  ]);
  await db.insert(steps).values([
    {
      recipeId: recipe.id,
      position: 0,
      body: 'Brown the lamb in a heavy pot',
      durationSeconds: 10 * 60,
    },
    { recipeId: recipe.id, position: 1, body: 'Add the carrots and cook until soft' },
  ]);
  console.log(`seeded ${title}`);
}

async function seedRyeBread(db: Database, authorId: string): Promise<void> {
  const title = "Grandmother's rye bread";
  if (await hasRecipe(db, authorId, title)) return;
  await db.insert(recipes).values({ authorId, title, servings: 1, status: 'ready' });
  console.log(`seeded ${title}`);
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');

  const { sql, db } = createDatabase(url, 2);

  const [janisSeed, annaSeed] = SEED_USERS;
  const janis = await ensureUser(db, janisSeed);
  const anna = await ensureUser(db, annaSeed);
  await seedBeetrootSoup(db, janis);
  await seedPlov(db, janis);
  await seedRyeBread(db, anna);

  await sql.end();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
