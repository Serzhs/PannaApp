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

interface StepSpec {
  readonly body: string;
  readonly note?: string;
  readonly minutes?: number;
  readonly uses?: readonly string[];
  readonly needs?: readonly string[];
  readonly photo?: { readonly key: string; readonly file: string };
  readonly meanwhile?: readonly StepSpec[];
}
type Unit =
  'g' | 'kg' | 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup' | 'piece' | 'pinch' | 'clove' | 'slice';
interface RecipeSpec {
  readonly title: string;
  readonly description: string;
  readonly servings: number;
  readonly status: 'draft' | 'ready';
  readonly featured?: boolean;
  readonly cover?: { readonly key: string; readonly file: string };
  readonly ingredients: readonly {
    readonly name: string;
    readonly amount?: number;
    readonly unit?: Unit;
    readonly note?: string;
  }[];
  readonly equipment: readonly { readonly name: string; readonly optional?: boolean }[];
  readonly steps: readonly StepSpec[];
  /** Cooks and notes, written once the steps exist; only the soup has any. */
  readonly history?: (
    db: Database,
    recipeId: string,
    stepId: (body: string) => string,
  ) => Promise<void>;
}

/**
 * One recipe from a description of it. Every step is one thing a pair of hands does, so
 * the guide reads like someone standing next to you; the note is the why or the how.
 */
async function seedRecipe(db: Database, authorId: string, spec: RecipeSpec): Promise<void> {
  if (await hasRecipe(db, authorId, spec.title)) return;
  const cover = spec.cover === undefined ? null : await seedImage(spec.cover.key, spec.cover.file);
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
      status: spec.status,
      featured: spec.featured ?? false,
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
  const stepIds = new Map<string, string>();
  const write = async (step: StepSpec, position: number, parentStepId: string | null) => {
    const imageKey =
      step.photo === undefined ? null : await seedImage(step.photo.key, step.photo.file);
    const [row] = await db
      .insert(steps)
      .values({
        recipeId: recipe.id,
        position,
        body: step.body,
        note: step.note ?? null,
        durationSeconds: step.minutes === undefined ? null : step.minutes * 60,
        imageKey,
        parentStepId,
      })
      .returning();
    if (!row) throw new Error('insert returned nothing');
    stepIds.set(step.body, row.id);
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
  await spec.history?.(db, recipe.id, (body) => {
    const id = stepIds.get(body);
    if (id === undefined) throw new Error(`${spec.title}: no step ${body}`);
    return id;
  });
  console.log(`seeded ${spec.title}${spec.featured === true ? ' (featured)' : ''}`);
}

const KNIFE_AND_BOARD = ['sharp knife', 'chopping board'] as const;

/** Everything a recipe can carry, so every screen has something to show (0015). */
const BEETROOT_SOUP: RecipeSpec = {
  title: 'Cold beetroot soup',
  description:
    'Latvian aukstā zupa: pink, sharp and cold. Best made the evening before and eaten on the first hot day of the year.',
  servings: 4,
  status: 'ready',
  cover: { key: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', file: 'soup.jpg' },
  ingredients: [
    { name: 'beetroot', amount: 500, unit: 'g', note: 'raw, with the leaves cut off' },
    { name: 'kefir', amount: 1, unit: 'l', note: 'cold' },
    { name: 'cucumber', amount: 1 },
    { name: 'eggs', amount: 2, unit: 'piece' },
    { name: 'dill', amount: 1, note: 'a big bunch' },
    { name: 'spring onions', amount: 3 },
    { name: 'salt', note: 'to taste' },
  ],
  equipment: [
    { name: 'large pot' },
    { name: 'small pot' },
    { name: 'sharp knife' },
    { name: 'chopping board' },
    { name: 'box grater' },
    { name: 'large bowl' },
    { name: 'blender', optional: true },
  ],
  steps: [
    {
      body: 'Cut the leaves off the beetroot and scrub it under the tap',
      note: 'Do not peel it: the skin comes off with your thumbs once it is cooked and cooled.',
      uses: ['beetroot'],
      needs: [...KNIFE_AND_BOARD],
    },
    {
      body: "Put the beetroot in the large pot and cover it with cold water by a hand's width",
      uses: ['beetroot'],
      needs: ['large pot'],
    },
    {
      body: 'Bring the pot to the boil over high heat, then turn it down to a gentle simmer',
      minutes: 10,
      needs: ['large pot'],
    },
    {
      body: 'Simmer until a knife slides into the beetroot with no push',
      note: 'Small ones take about 35 minutes, big ones closer to an hour. Top up the water if it drops below them.',
      minutes: 45,
      uses: ['beetroot'],
      needs: ['large pot'],
      meanwhile: [
        {
          body: 'Put the eggs in the small pot, cover them with cold water and bring it to the boil',
          uses: ['eggs'],
          needs: ['small pot'],
        },
        {
          body: 'Boil the eggs for 9 minutes, then drain and cool them in cold water',
          note: 'Cold water straight away stops the grey ring around the yolk.',
          minutes: 9,
          uses: ['eggs'],
          needs: ['small pot'],
        },
        {
          body: 'Peel the cucumber if the skin is tough, and dice it small',
          uses: ['cucumber'],
          needs: [...KNIFE_AND_BOARD],
        },
        {
          body: 'Chop the dill finely, thin stalks and all',
          uses: ['dill'],
          needs: [...KNIFE_AND_BOARD],
        },
        {
          body: 'Slice the spring onions into thin rings, green part included',
          uses: ['spring onions'],
          needs: [...KNIFE_AND_BOARD],
        },
      ],
    },
    {
      body: 'Drain the beetroot and leave it until you can hold it',
      minutes: 15,
      uses: ['beetroot'],
    },
    {
      body: 'Rub the skin off the beetroot with your thumbs',
      note: 'Wear an apron and do it over the sink. Beetroot does not come out of anything.',
      uses: ['beetroot'],
    },
    {
      body: 'Grate the beetroot on the coarse side of the box grater',
      uses: ['beetroot'],
      needs: ['box grater'],
      photo: { key: '0f1e2d3c4b5a69788796a5b4c3d2e1f0', file: 'grated.jpg' },
    },
    { body: 'Pour the kefir into the large bowl', uses: ['kefir'], needs: ['large bowl'] },
    {
      body: 'Stir the beetroot, cucumber, dill and spring onions into the kefir',
      note: 'For a smoother soup, blend a third of it and stir it back in.',
      uses: ['beetroot', 'cucumber', 'dill', 'spring onions', 'kefir'],
      needs: ['large bowl', 'blender'],
    },
    {
      body: 'Salt it, tasting as you go',
      note: 'It should taste slightly too salty now: chilling dulls it.',
      uses: ['salt'],
    },
    {
      body: 'Cover and chill for at least an hour, overnight if you can',
      minutes: 60,
      needs: ['large bowl'],
    },
    { body: 'Peel the eggs and cut each in half', uses: ['eggs'], needs: [...KNIFE_AND_BOARD] },
    { body: 'Ladle the soup into bowls and lay a halved egg on each', uses: ['eggs'] },
  ],
  history: async (db, recipeId, stepId) => {
    const [made] = await db
      .insert(cooks)
      .values([
        {
          recipeId,
          startedAt: new Date('2026-08-30T16:00:00Z'),
          finishedAt: new Date('2026-08-30T17:10:00Z'),
          excluded: [],
        },
        {
          recipeId,
          startedAt: new Date('2026-09-14T15:30:00Z'),
          finishedAt: new Date('2026-09-14T16:40:00Z'),
          excluded: ['spring onions'],
        },
      ])
      .returning();
    await db.insert(cookNotes).values([
      {
        recipeId,
        stepId: null,
        cookId: made?.id ?? null,
        body: 'Half a lemon squeezed in at the end made it brighter. Do that again.',
      },
      {
        recipeId,
        stepId: stepId('Simmer until a knife slides into the beetroot with no push'),
        cookId: null,
        body: 'Small beetroots were done in 35 minutes, not 45.',
      },
    ]);
  },
};

/** Still a draft, so the list has a Draft chip to look at; the recipe itself is complete. */
const PLOV: RecipeSpec = {
  title: 'Plov',
  description:
    'Uzbek rice with lamb and carrots, cooked in one pot. Written out in full, but I want to check the rice timing once more before I call it ready.',
  servings: 6,
  status: 'draft',
  cover: { key: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', file: 'plov.jpg' },
  ingredients: [
    { name: 'lamb shoulder', amount: 600, unit: 'g', note: 'on or off the bone, with some fat' },
    { name: 'rice', amount: 500, unit: 'g', note: 'basmati, if you can' },
    { name: 'carrots', amount: 4, note: 'large' },
    { name: 'onions', amount: 2 },
    { name: 'vegetable oil', amount: 100, unit: 'ml' },
    { name: 'garlic', amount: 1, note: 'a whole head, unpeeled' },
    { name: 'cumin seeds', amount: 2, unit: 'tsp' },
    { name: 'salt', amount: 2, unit: 'tsp' },
    { name: 'black pepper', amount: 1, unit: 'tsp', note: 'freshly ground' },
    { name: 'hot water', amount: 1.5, unit: 'l', note: 'from the kettle' },
  ],
  equipment: [
    { name: 'heavy pot with a lid', optional: false },
    { name: 'sharp knife' },
    { name: 'chopping board' },
    { name: 'sieve' },
    { name: 'kettle' },
    { name: 'wooden spoon' },
  ],
  steps: [
    {
      body: 'Rinse the rice in the sieve under the cold tap until the water runs clear',
      note: 'This takes longer than you think. Cloudy water means the grains will stick.',
      uses: ['rice'],
      needs: ['sieve'],
    },
    {
      body: 'Cover the rice with warm water and leave it to soak',
      minutes: 30,
      uses: ['rice'],
      meanwhile: [
        {
          body: 'Peel the carrots and cut them into matchsticks as thick as a pencil lead',
          note: 'Cut, never grate: grated carrot melts into the rice and the plov goes orange.',
          uses: ['carrots'],
          needs: [...KNIFE_AND_BOARD],
        },
        {
          body: 'Peel the onions and slice them into thin half-moons',
          uses: ['onions'],
          needs: [...KNIFE_AND_BOARD],
        },
        {
          body: 'Cut the lamb into pieces about the size of a walnut',
          note: 'Keep the fat on. It is what makes the rice taste of something.',
          uses: ['lamb shoulder'],
          needs: [...KNIFE_AND_BOARD],
        },
        { body: 'Fill the kettle and boil it', uses: ['hot water'], needs: ['kettle'] },
      ],
    },
    {
      body: 'Put the empty pot on high heat until a drop of water skips across the bottom',
      minutes: 3,
      needs: ['heavy pot with a lid'],
    },
    {
      body: 'Pour in the oil and heat it until it shimmers and just starts to smoke',
      minutes: 2,
      uses: ['vegetable oil'],
      needs: ['heavy pot with a lid'],
    },
    {
      body: 'Lay the lamb in the pot in one layer and leave it alone until the underside is dark brown',
      note: 'Do not stir and do not crowd it. If it will not fit in one layer, do it in two batches.',
      minutes: 5,
      uses: ['lamb shoulder'],
      needs: ['heavy pot with a lid'],
    },
    {
      body: 'Turn the pieces over and brown the other sides',
      minutes: 5,
      uses: ['lamb shoulder'],
      needs: ['wooden spoon'],
    },
    {
      body: 'Add the onions and fry them, stirring, until golden',
      minutes: 8,
      uses: ['onions'],
      needs: ['wooden spoon'],
    },
    {
      body: 'Add the carrots and fry until they soften and begin to colour at the edges',
      minutes: 10,
      uses: ['carrots'],
      needs: ['wooden spoon'],
    },
    {
      body: 'Stir in the cumin, salt and pepper',
      uses: ['cumin seeds', 'salt', 'black pepper'],
    },
    {
      body: 'Pour in hot water to just cover the meat, and push the whole garlic head into the middle',
      uses: ['hot water', 'garlic'],
      needs: ['kettle'],
    },
    {
      body: 'Simmer, uncovered, until the lamb is tender',
      note: 'This is the zirvak, the base. It should taste a little too salty, because the rice takes salt from it.',
      minutes: 40,
      uses: ['lamb shoulder'],
      needs: ['heavy pot with a lid'],
    },
    {
      body: 'Drain the rice and spread it over the meat in an even layer, without stirring',
      note: 'The rice stays on top from here on. Stirring now makes it gluey.',
      uses: ['rice'],
      needs: ['sieve'],
    },
    {
      body: 'Pour in hot water until it stands a finger above the rice',
      note: 'Pour it over the back of the spoon so it does not dig a hole in the rice.',
      uses: ['hot water'],
      needs: ['kettle', 'wooden spoon'],
    },
    {
      body: 'Boil hard until the water has gone down below the surface of the rice',
      minutes: 10,
      needs: ['heavy pot with a lid'],
    },
    {
      body: 'Poke holes to the bottom with the spoon handle, turn the heat to its lowest, put the lid on',
      note: 'The holes let steam through. Wrap the lid in a tea towel if it does not fit tightly.',
      needs: ['wooden spoon', 'heavy pot with a lid'],
    },
    { body: 'Leave it to steam, lid on, no peeking', minutes: 25, needs: ['heavy pot with a lid'] },
    { body: 'Take the pot off the heat and let it rest with the lid on', minutes: 10 },
    {
      body: 'Lift out the garlic, then turn the rice, carrots and meat together from the bottom up',
      uses: ['garlic'],
      needs: ['wooden spoon'],
    },
    {
      body: 'Pile it onto one big dish, meat on top, garlic in the middle, and eat with your hands or a spoon',
    },
  ],
};

const RYE_BREAD: RecipeSpec = {
  title: "Grandmother's rye bread",
  description:
    'A dark, dense loaf with caraway, the kind that keeps for a week. Yeast rather than sourdough, so it can be made the same day.',
  servings: 1,
  status: 'ready',
  cover: { key: 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6', file: 'bread.jpg' },
  ingredients: [
    { name: 'rye flour', amount: 500, unit: 'g', note: 'wholemeal' },
    { name: 'plain flour', amount: 200, unit: 'g' },
    { name: 'water', amount: 500, unit: 'ml', note: 'hand-hot' },
    { name: 'dried yeast', amount: 7, unit: 'g', note: 'one sachet' },
    { name: 'honey', amount: 2, unit: 'tbsp' },
    { name: 'salt', amount: 2, unit: 'tsp' },
    { name: 'caraway seeds', amount: 1, unit: 'tbsp' },
    { name: 'butter', amount: 10, unit: 'g', note: 'for the tin' },
  ],
  equipment: [
    { name: 'large bowl' },
    { name: 'small jug' },
    { name: 'wooden spoon' },
    { name: 'loaf tin' },
    { name: 'tea towel' },
    { name: 'oven' },
    { name: 'wire rack' },
  ],
  steps: [
    {
      body: 'Warm the water in the jug until it feels like a warm bath on your wrist',
      note: 'Too hot kills the yeast. If you cannot hold a finger in it, wait.',
      uses: ['water'],
      needs: ['small jug'],
    },
    {
      body: 'Stir the honey and the yeast into the water and leave it until it foams on top',
      minutes: 10,
      uses: ['honey', 'dried yeast', 'water'],
      needs: ['small jug'],
      meanwhile: [
        {
          body: 'Tip both flours and the salt into the large bowl and mix them with your hand',
          uses: ['rye flour', 'plain flour', 'salt'],
          needs: ['large bowl'],
        },
        {
          body: 'Rub the butter around the inside of the loaf tin',
          uses: ['butter'],
          needs: ['loaf tin'],
        },
      ],
    },
    {
      body: 'Pour the yeast water into the flour and stir until there is no dry flour left',
      note: 'It will be sticky, more like thick mud than bread dough. That is right for rye.',
      uses: ['water'],
      needs: ['large bowl', 'wooden spoon'],
    },
    {
      body: 'Wet one hand and work the dough in the bowl, folding it over on itself',
      note: 'Rye has no stretch, so there is nothing to knead. You are only mixing it well.',
      minutes: 5,
      needs: ['large bowl'],
    },
    {
      body: 'Cover the bowl with the tea towel and leave it somewhere warm until it looks puffy',
      minutes: 90,
      needs: ['large bowl', 'tea towel'],
    },
    {
      body: 'Stir the caraway through the dough with the spoon',
      uses: ['caraway seeds'],
      needs: ['wooden spoon'],
    },
    {
      body: 'Spoon the dough into the tin and smooth the top with a wet hand',
      needs: ['loaf tin'],
    },
    {
      body: 'Cover the tin and leave it until the dough reaches the rim',
      minutes: 45,
      needs: ['loaf tin', 'tea towel'],
      meanwhile: [
        {
          body: 'Heat the oven to 220 degrees with a shelf in the middle',
          minutes: 20,
          needs: ['oven'],
        },
      ],
    },
    {
      body: 'Brush the top with water and put the tin in the oven',
      uses: ['water'],
      needs: ['oven', 'loaf tin'],
    },
    {
      body: 'Bake until the crust is dark and the loaf sounds hollow when tapped underneath',
      minutes: 45,
      needs: ['oven'],
    },
    {
      body: 'Turn the loaf out onto the rack and leave it to cool completely before cutting',
      note: 'Cutting it warm makes the inside gummy. Wrapped in the tea towel overnight is best.',
      minutes: 120,
      needs: ['wire rack', 'tea towel'],
    },
  ],
};

const GREY_PEAS: RecipeSpec = {
  title: 'Grey peas with bacon',
  description:
    'Pelēkie zirņi ar speķi: the Latvian winter supper. Soak the peas the night before and the rest is patience.',
  servings: 4,
  status: 'ready',
  featured: true,
  cover: { key: 'd0e1f2a3b4c5d6e7f8091a2b3c4d5e6f', file: 'peas.jpg' },
  ingredients: [
    { name: 'dried grey peas', amount: 500, unit: 'g' },
    { name: 'smoked bacon', amount: 200, unit: 'g', note: 'streaky, in one piece' },
    { name: 'onions', amount: 2 },
    { name: 'butter', amount: 30, unit: 'g' },
    { name: 'salt', note: 'to taste' },
    { name: 'kefir', amount: 500, unit: 'ml', note: 'to drink alongside' },
  ],
  equipment: [
    { name: 'large bowl' },
    { name: 'colander' },
    { name: 'large pot' },
    { name: 'frying pan' },
    { name: 'sharp knife' },
    { name: 'chopping board' },
    { name: 'wooden spoon' },
  ],
  steps: [
    {
      body: 'The night before, tip the peas into the large bowl and cover them with cold water by two fingers',
      note: 'They double in size. Use a bigger bowl than looks right. Untimed: it is the night before.',
      uses: ['dried grey peas'],
      needs: ['large bowl'],
    },
    {
      body: 'Drain the peas in the colander and rinse them under the cold tap',
      uses: ['dried grey peas'],
      needs: ['colander'],
    },
    {
      body: "Put the peas in the large pot and cover them with fresh cold water by a hand's width",
      uses: ['dried grey peas'],
      needs: ['large pot'],
    },
    {
      body: 'Bring the pot to the boil over high heat and spoon off the grey foam',
      minutes: 10,
      needs: ['large pot', 'wooden spoon'],
    },
    {
      body: 'Turn the heat down and simmer gently until the peas are soft all the way through',
      note: 'No salt yet, or the skins stay tough. Bite one: it should give with no chalk in the middle.',
      minutes: 90,
      uses: ['dried grey peas'],
      needs: ['large pot'],
      meanwhile: [
        {
          body: 'Cut the bacon into dice about a centimetre across',
          uses: ['smoked bacon'],
          needs: [...KNIFE_AND_BOARD],
        },
        {
          body: 'Peel the onions and dice them the same size',
          uses: ['onions'],
          needs: [...KNIFE_AND_BOARD],
        },
        {
          body: 'Put the frying pan on medium heat with nothing in it',
          minutes: 2,
          needs: ['frying pan'],
        },
        {
          body: 'Add the bacon and fry it, stirring now and then, until it is crisp and the fat has run',
          minutes: 10,
          uses: ['smoked bacon'],
          needs: ['frying pan', 'wooden spoon'],
        },
        {
          body: 'Add the butter and the onions and fry until the onions are soft and golden',
          minutes: 8,
          uses: ['butter', 'onions'],
          needs: ['frying pan', 'wooden spoon'],
        },
      ],
    },
    {
      body: 'Drain the peas in the colander, keeping a cup of the cooking water',
      uses: ['dried grey peas'],
      needs: ['colander'],
    },
    {
      body: 'Tip the peas back into the pot and stir in the bacon and onions with all their fat',
      uses: ['dried grey peas', 'smoked bacon', 'onions'],
      needs: ['large pot', 'wooden spoon'],
    },
    {
      body: 'Salt to taste, and loosen with a splash of the cooking water if it looks dry',
      uses: ['salt'],
    },
    { body: 'Serve hot in bowls, with a glass of cold kefir each', uses: ['kefir'] },
  ],
};

const SKLANDRAUSIS: RecipeSpec = {
  title: 'Sklandrausis',
  description:
    'Open rye tarts from Kurzeme with a layer of potato under a layer of sweet carrot. Small, and better slightly warm.',
  servings: 8,
  status: 'ready',
  featured: true,
  cover: { key: 'e1f2a3b4c5d6e7f8091a2b3c4d5e6f70', file: 'sklandrausis.jpg' },
  ingredients: [
    { name: 'rye flour', amount: 300, unit: 'g' },
    { name: 'water', amount: 150, unit: 'ml', note: 'warm' },
    { name: 'butter', amount: 50, unit: 'g', note: 'melted' },
    { name: 'salt', amount: 1, unit: 'tsp' },
    { name: 'potatoes', amount: 400, unit: 'g' },
    { name: 'carrots', amount: 500, unit: 'g' },
    { name: 'eggs', amount: 2, unit: 'piece' },
    { name: 'sour cream', amount: 100, unit: 'ml', note: 'plus a little to glaze' },
    { name: 'sugar', amount: 2, unit: 'tbsp' },
    { name: 'caraway seeds', amount: 1, unit: 'tsp' },
  ],
  equipment: [
    { name: 'large bowl' },
    { name: 'two small pots' },
    { name: 'potato masher' },
    { name: 'rolling pin' },
    { name: 'baking tray' },
    { name: 'baking paper' },
    { name: 'oven' },
    { name: 'pastry brush' },
    { name: 'round cutter', optional: true },
  ],
  steps: [
    {
      body: 'Mix the rye flour and salt in the large bowl, then pour in the warm water and melted butter',
      uses: ['rye flour', 'salt', 'water', 'butter'],
      needs: ['large bowl'],
    },
    {
      body: 'Bring it together with your hands into a stiff dough, then cover it and let it rest',
      note: 'Rye has no stretch. It should feel like clay, not like bread dough.',
      minutes: 30,
      needs: ['large bowl'],
      meanwhile: [
        {
          body: 'Peel the potatoes, cut them into chunks and boil them in salted water until soft',
          minutes: 20,
          uses: ['potatoes'],
          needs: ['two small pots'],
        },
        {
          body: 'Peel the carrots, slice them and boil them in the other pot until soft',
          minutes: 20,
          uses: ['carrots'],
          needs: ['two small pots'],
        },
        {
          body: 'Drain the potatoes and mash them with one egg and a spoonful of sour cream',
          uses: ['potatoes', 'eggs', 'sour cream'],
          needs: ['potato masher'],
        },
        {
          body: 'Drain the carrots and mash them with the sugar, the other egg, the rest of the sour cream and the caraway',
          uses: ['carrots', 'sugar', 'eggs', 'sour cream', 'caraway seeds'],
          needs: ['potato masher'],
        },
        {
          body: 'Heat the oven to 200 degrees and line the tray with baking paper',
          minutes: 15,
          needs: ['oven', 'baking tray', 'baking paper'],
        },
      ],
    },
    {
      body: 'Roll the dough out thin on a floured surface, about the thickness of a coin',
      uses: ['rye flour'],
      needs: ['rolling pin'],
    },
    {
      body: 'Cut rounds the size of a saucer and lift them onto the tray',
      needs: ['round cutter', 'baking tray'],
    },
    {
      body: 'Pinch the edge of each round up into a rim a finger high',
      note: 'The rim holds the filling in. Make it a little taller than looks necessary; it slumps in the oven.',
    },
    {
      body: 'Spread a layer of the potato in each, then the carrot on top, right out to the rim',
      uses: ['potatoes', 'carrots'],
    },
    {
      body: 'Bake until the rims are firm and the carrot has set with a few dark spots',
      minutes: 20,
      needs: ['oven', 'baking tray'],
    },
    {
      body: 'Brush the tops with sour cream while they are hot',
      uses: ['sour cream'],
      needs: ['pastry brush'],
    },
    { body: 'Let them cool a little on the tray, and eat them warm', minutes: 10 },
  ],
};

const PANCAKES: RecipeSpec = {
  title: 'Pankūkas',
  description:
    'Thin pancakes, the everyday kind. Eaten with jam, with sour cream, or rolled around whatever is in the fridge.',
  servings: 4,
  status: 'ready',
  featured: true,
  cover: { key: 'f2a3b4c5d6e7f8091a2b3c4d5e6f7081', file: 'pancakes.jpg' },
  ingredients: [
    { name: 'eggs', amount: 2, unit: 'piece' },
    { name: 'milk', amount: 500, unit: 'ml' },
    { name: 'plain flour', amount: 250, unit: 'g' },
    { name: 'sugar', amount: 1, unit: 'tbsp' },
    { name: 'salt', amount: 1, unit: 'pinch' },
    { name: 'butter', amount: 50, unit: 'g', note: 'half melted for the batter, half for the pan' },
    { name: 'jam', note: 'to serve' },
  ],
  equipment: [
    { name: 'large bowl' },
    { name: 'whisk' },
    { name: 'small pot' },
    { name: 'frying pan', optional: false },
    { name: 'ladle' },
    { name: 'spatula' },
    { name: 'plate' },
  ],
  steps: [
    {
      body: 'Melt half the butter in the small pot over low heat and set it aside to cool',
      uses: ['butter'],
      needs: ['small pot'],
    },
    {
      body: 'Crack the eggs into the large bowl and whisk them with the sugar and salt until pale',
      uses: ['eggs', 'sugar', 'salt'],
      needs: ['large bowl', 'whisk'],
    },
    { body: 'Whisk in the milk', uses: ['milk'], needs: ['whisk'] },
    {
      body: 'Add the flour a handful at a time, whisking, until the batter is smooth and as thin as cream',
      note: 'If there are lumps, keep whisking; they go. Too thick, and the pancakes come out heavy.',
      uses: ['plain flour'],
      needs: ['whisk'],
    },
    { body: 'Whisk in the melted butter', uses: ['butter'], needs: ['whisk'] },
    {
      body: 'Let the batter rest',
      note: 'Resting lets the flour swell, which is what stops the first pancake tearing.',
      minutes: 20,
      needs: ['large bowl'],
      meanwhile: [
        {
          body: 'Put the frying pan on medium-high heat until a drop of water skips across it',
          minutes: 3,
          needs: ['frying pan'],
        },
      ],
    },
    {
      body: 'Rub a little butter over the pan with a piece of kitchen paper',
      uses: ['butter'],
      needs: ['frying pan'],
    },
    {
      body: 'Pour in a small ladle of batter and tilt the pan straight away so it runs to the edges',
      note: 'The first one is always odd. Eat it standing up.',
      uses: ['plain flour'],
      needs: ['frying pan', 'ladle'],
    },
    {
      body: 'Cook until the edges lift and the top has gone from wet to matt, then flip it with the spatula',
      minutes: 1,
      needs: ['frying pan', 'spatula'],
    },
    {
      body: 'Cook the other side for half a minute, then slide it onto the plate',
      minutes: 1,
      needs: ['frying pan', 'spatula', 'plate'],
    },
    {
      body: 'Keep going, buttering the pan every few pancakes, stacking them on the plate',
      minutes: 12,
      uses: ['butter'],
      needs: ['frying pan', 'ladle', 'spatula', 'plate'],
    },
    { body: 'Serve warm, rolled or folded, with jam', uses: ['jam'] },
  ],
};

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');

  const { sql, db } = createDatabase(url, 2);

  const [janisSeed, annaSeed, pannaSeed] = SEED_USERS;
  const janis = await ensureUser(db, janisSeed);
  const anna = await ensureUser(db, annaSeed);
  const panna = await ensureUser(db, pannaSeed);
  await seedRecipe(db, janis, BEETROOT_SOUP);
  await seedRecipe(db, janis, PLOV);
  await seedRecipe(db, anna, RYE_BREAD);
  for (const spec of [GREY_PEAS, SKLANDRAUSIS, PANCAKES]) await seedRecipe(db, panna, spec);

  await sql.end();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
