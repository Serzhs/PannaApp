import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname } from 'node:path';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  /** Owns the featured recipes (0019): the ones we wrote, marked here and nowhere else. */
  { email: 'panna@example.com', displayName: 'Panna' },
] as const;

const IMAGE_DIR = process.env.IMAGE_DIR ?? join(homedir(), '.panna', 'images');
const PHOTOS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'seed-photos');

/**
 * Real photographs, from seed-photos/ (see ATTRIBUTION.md there), put through the same
 * resize and strip an upload gets, so the seed looks like what a user would have.
 */
async function seedImage(key: string, file: string): Promise<string> {
  await mkdir(IMAGE_DIR, { recursive: true });
  const bytes = await sharp(await readFile(join(PHOTOS_DIR, file)))
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
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

  const cover = await seedImage('a1b2c3d4e5f60718293a4b5c6d7e8f90', 'soup.jpg');
  const stepPhoto = await seedImage('0f1e2d3c4b5a69788796a5b4c3d2e1f0', 'grated.jpg');

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
  const cover = await seedImage('5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', 'plov.jpg');
  const [recipe] = await db
    .insert(recipes)
    .values({
      authorId,
      title,
      description: 'Still working this one out.',
      servings: 6,
      status: 'draft',
      coverImageKey: cover,
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
  const cover = await seedImage('c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6', 'bread.jpg');
  await db
    .insert(recipes)
    .values({ authorId, title, servings: 1, status: 'ready', coverImageKey: cover });
  console.log(`seeded ${title}`);
}

interface FeaturedStep {
  readonly body: string;
  readonly note?: string;
  readonly minutes?: number;
  readonly uses?: readonly string[];
  readonly needs?: readonly string[];
  readonly meanwhile?: readonly FeaturedStep[];
}
interface FeaturedSpec {
  readonly title: string;
  readonly description: string;
  readonly servings: number;
  readonly imageKey: string;
  readonly photo: string;
  readonly ingredients: readonly {
    readonly name: string;
    readonly amount?: number;
    readonly unit?: 'g' | 'kg' | 'ml' | 'l' | 'tsp' | 'tbsp' | 'piece' | 'pinch';
    readonly note?: string;
  }[];
  readonly equipment: readonly { readonly name: string; readonly optional?: boolean }[];
  readonly steps: readonly FeaturedStep[];
}

/** One of ours (0019): ready, featured, with a real photo, and nothing about it a person wrote. */
async function seedFeatured(db: Database, authorId: string, spec: FeaturedSpec): Promise<void> {
  if (await hasRecipe(db, authorId, spec.title)) return;
  const cover = await seedImage(spec.imageKey, spec.photo);
  // The API sums the main steps on every write; a direct insert has to do the same.
  const totalTimeMinutes = spec.steps.reduce((sum, step) => sum + (step.minutes ?? 0), 0);
  const [recipe] = await db
    .insert(recipes)
    .values({
      authorId,
      title: spec.title,
      description: spec.description,
      servings: spec.servings,
      totalTimeMinutes: totalTimeMinutes === 0 ? null : totalTimeMinutes,
      status: 'ready',
      featured: true,
      coverImageKey: cover,
    })
    .returning();
  if (!recipe) throw new Error('insert returned nothing');
  const lines = await db
    .insert(ingredients)
    .values(
      spec.ingredients.map((line, position) => ({
        recipeId: recipe.id,
        position,
        name: line.name,
        amount: line.amount === undefined ? null : String(line.amount),
        unit: line.unit ?? null,
        note: line.note ?? null,
      })),
    )
    .returning();
  const tools =
    spec.equipment.length === 0
      ? []
      : await db
          .insert(equipment)
          .values(
            spec.equipment.map((tool, position) => ({
              recipeId: recipe.id,
              position,
              name: tool.name,
              note: null,
              optional: tool.optional ?? false,
            })),
          )
          .returning();
  const idOf = (name: string, rows: readonly { id: string; name: string }[]) => {
    const row = rows.find((r) => r.name === name);
    if (row === undefined) throw new Error(`${spec.title}: no ${name}`);
    return row.id;
  };
  const write = async (step: FeaturedStep, position: number, parentStepId: string | null) => {
    const [row] = await db
      .insert(steps)
      .values({
        recipeId: recipe.id,
        position,
        body: step.body,
        note: step.note ?? null,
        durationSeconds: step.minutes === undefined ? null : step.minutes * 60,
        parentStepId,
      })
      .returning();
    if (!row) throw new Error('insert returned nothing');
    const uses = (step.uses ?? []).map((name) => idOf(name, lines));
    const needs = (step.needs ?? []).map((name) => idOf(name, tools));
    if (uses.length > 0) {
      await db
        .insert(stepIngredients)
        .values(uses.map((ingredientId) => ({ stepId: row.id, ingredientId })));
    }
    if (needs.length > 0) {
      await db
        .insert(stepEquipment)
        .values(needs.map((equipmentId) => ({ stepId: row.id, equipmentId })));
    }
    for (const [i, child] of (step.meanwhile ?? []).entries()) await write(child, i, row.id);
  };
  for (const [i, step] of spec.steps.entries()) await write(step, i, null);
  console.log(`seeded ${spec.title} (featured)`);
}

const FEATURED: readonly FeaturedSpec[] = [
  {
    title: 'Grey peas with bacon',
    description:
      'Pelēkie zirņi ar speķi: the Latvian winter supper. Soak the peas the night before and the rest is patience.',
    servings: 4,
    imageKey: 'd0e1f2a3b4c5d6e7f8091a2b3c4d5e6f',
    photo: 'peas.jpg',
    ingredients: [
      { name: 'dried grey peas', amount: 500, unit: 'g', note: 'soaked overnight' },
      { name: 'smoked bacon', amount: 200, unit: 'g', note: 'streaky, in one piece' },
      { name: 'onions', amount: 2 },
      { name: 'butter', amount: 30, unit: 'g' },
      { name: 'salt' },
      { name: 'kefir', note: 'to drink alongside' },
    ],
    equipment: [{ name: 'large pot' }, { name: 'frying pan' }],
    steps: [
      {
        body: 'Soak the peas overnight in plenty of cold water',
        note: 'They double in size. Use a bigger bowl than looks right. Untimed: it is the night before.',
        uses: ['dried grey peas'],
      },
      {
        body: 'Drain, cover with fresh water and simmer until soft',
        note: 'Salt only at the end, or the skins stay tough.',
        minutes: 90,
        uses: ['dried grey peas'],
        needs: ['large pot'],
        meanwhile: [
          { body: 'Dice the bacon and the onions', uses: ['smoked bacon', 'onions'] },
          {
            body: 'Fry the bacon until crisp, then soften the onions in its fat with the butter',
            minutes: 10,
            uses: ['smoked bacon', 'onions', 'butter'],
            needs: ['frying pan'],
          },
        ],
      },
      {
        body: 'Drain the peas, keeping a cup of the cooking water',
        uses: ['dried grey peas'],
      },
      {
        body: 'Stir the bacon and onions through the peas, salt, and loosen with a little of the water',
        uses: ['salt'],
      },
      { body: 'Serve hot, with a glass of kefir', uses: ['kefir'] },
    ],
  },
  {
    title: 'Sklandrausis',
    description:
      'Open rye tarts from Kurzeme with a layer of potato under a layer of sweet carrot. Small, and better slightly warm.',
    servings: 8,
    imageKey: 'e1f2a3b4c5d6e7f8091a2b3c4d5e6f70',
    photo: 'sklandrausis.jpg',
    ingredients: [
      { name: 'rye flour', amount: 300, unit: 'g' },
      { name: 'water', amount: 150, unit: 'ml', note: 'warm' },
      { name: 'butter', amount: 50, unit: 'g', note: 'melted' },
      { name: 'salt', amount: 1, unit: 'tsp' },
      { name: 'potatoes', amount: 400, unit: 'g' },
      { name: 'carrots', amount: 500, unit: 'g' },
      { name: 'eggs', amount: 2 },
      { name: 'sour cream', amount: 100, unit: 'ml', note: 'plus a little to glaze' },
      { name: 'sugar', amount: 2, unit: 'tbsp' },
      { name: 'caraway seeds', amount: 1, unit: 'tsp' },
    ],
    equipment: [
      { name: 'rolling pin' },
      { name: 'baking tray' },
      { name: 'potato masher' },
      { name: 'round cutter', optional: true },
    ],
    steps: [
      {
        body: 'Mix the rye flour, salt, warm water and melted butter into a stiff dough, and let it rest',
        note: 'Rye has no stretch. It should feel like clay, not like bread dough.',
        minutes: 30,
        uses: ['rye flour', 'water', 'butter', 'salt'],
        meanwhile: [
          {
            body: 'Boil the potatoes and mash them with one egg and a spoon of sour cream',
            minutes: 25,
            uses: ['potatoes', 'eggs', 'sour cream'],
            needs: ['potato masher'],
          },
          {
            body: 'Boil the carrots and mash them with the sugar, the other egg, the rest of the sour cream and the caraway',
            minutes: 25,
            uses: ['carrots', 'sugar', 'eggs', 'sour cream', 'caraway seeds'],
            needs: ['potato masher'],
          },
        ],
      },
      {
        body: 'Roll the dough thin, cut rounds the size of a saucer and pinch the edges up into a rim',
        uses: ['rye flour'],
        needs: ['rolling pin', 'round cutter'],
      },
      {
        body: 'Spread potato in each, then carrot on top, right to the rim',
        uses: ['potatoes', 'carrots'],
        needs: ['baking tray'],
      },
      {
        body: 'Bake at 200 degrees until the rims are firm and the carrot has set',
        minutes: 20,
        needs: ['baking tray'],
      },
      {
        body: 'Brush with sour cream while hot and let them cool a little',
        uses: ['sour cream'],
      },
    ],
  },
  {
    title: 'Pankūkas',
    description:
      'Thin pancakes, the everyday kind. Eaten with jam, with sour cream, or rolled around whatever is in the fridge.',
    servings: 4,
    imageKey: 'f2a3b4c5d6e7f8091a2b3c4d5e6f7081',
    photo: 'pancakes.jpg',
    ingredients: [
      { name: 'eggs', amount: 2 },
      { name: 'milk', amount: 500, unit: 'ml' },
      { name: 'plain flour', amount: 250, unit: 'g' },
      { name: 'sugar', amount: 1, unit: 'tbsp' },
      { name: 'salt', amount: 1, unit: 'pinch' },
      { name: 'butter', amount: 30, unit: 'g', note: 'melted, plus more for the pan' },
      { name: 'jam', note: 'to serve' },
    ],
    equipment: [{ name: 'frying pan' }, { name: 'whisk' }, { name: 'ladle' }],
    steps: [
      {
        body: 'Whisk the eggs with the sugar and salt, then whisk in the milk',
        uses: ['eggs', 'sugar', 'salt', 'milk'],
        needs: ['whisk'],
      },
      {
        body: 'Whisk in the flour until smooth, then the melted butter, and let the batter rest',
        note: 'Resting lets the flour swell, which is what stops the first pancake tearing.',
        minutes: 20,
        uses: ['plain flour', 'butter'],
        needs: ['whisk'],
        meanwhile: [
          { body: 'Heat the pan until a drop of water skips across it', needs: ['frying pan'] },
        ],
      },
      {
        body: 'Fry thin pancakes, a small ladle at a time, about a minute a side',
        note: 'Tilt the pan as you pour so the batter runs to the edge.',
        minutes: 15,
        uses: ['butter'],
        needs: ['frying pan', 'ladle'],
      },
      { body: 'Serve warm, with jam', uses: ['jam'] },
    ],
  },
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');

  const { sql, db } = createDatabase(url, 2);

  const [janisSeed, annaSeed, pannaSeed] = SEED_USERS;
  const janis = await ensureUser(db, janisSeed);
  const anna = await ensureUser(db, annaSeed);
  const panna = await ensureUser(db, pannaSeed);
  await seedBeetrootSoup(db, janis);
  await seedPlov(db, janis);
  await seedRyeBread(db, anna);
  for (const spec of FEATURED) await seedFeatured(db, panna, spec);

  await sql.end();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
