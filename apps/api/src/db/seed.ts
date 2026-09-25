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
/** Latvian by explicit choice, so the app opens in Latvian on any phone: it is who these people are. */
const SEED_USERS = [
  { email: 'janis@example.com', displayName: 'Jānis', locale: 'lv' },
  { email: 'anna@example.com', displayName: 'Anna', locale: 'lv' },
  /** Owns the featured recipes (0019): the ones we wrote, marked here and nowhere else. */
  { email: 'panna@example.com', displayName: 'Panna', locale: 'lv' },
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
  seed: { readonly email: string; readonly displayName: string; readonly locale: 'en' | 'lv' },
): Promise<string> {
  const [existing] = await db.select().from(users).where(eq(users.email, seed.email)).limit(1);
  if (existing !== undefined) {
    // Development data: an older seed's user picks up the language too.
    await db.update(users).set({ locale: seed.locale }).where(eq(users.id, existing.id));
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

const NAZIS_UN_DELITIS = ['ass nazis', 'dēlītis'] as const;

/** Everything a recipe can carry, so every screen has something to show (0015). */
const AUKSTA_ZUPA: RecipeSpec = {
  title: 'Aukstā zupa',
  description:
    'Rozā, spirgta un auksta. Vislabāk pagatavot iepriekšējā vakarā un ēst pirmajā karstajā vasaras dienā.',
  servings: 4,
  status: 'ready',
  cover: { key: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', file: 'soup.jpg' },
  ingredients: [
    { name: 'bietes', amount: 500, unit: 'g', note: 'svaigas, ar nogrieztām lapām' },
    { name: 'kefīrs', amount: 1, unit: 'l', note: 'auksts' },
    { name: 'gurķis', amount: 1 },
    { name: 'olas', amount: 2, unit: 'piece' },
    { name: 'dilles', amount: 1, note: 'liels saišķis' },
    { name: 'zaļie sīpoli', amount: 3 },
    { name: 'sāls', note: 'pēc garšas' },
  ],
  equipment: [
    { name: 'liels katls' },
    { name: 'mazs katls' },
    { name: 'ass nazis' },
    { name: 'dēlītis' },
    { name: 'rīve' },
    { name: 'liela bļoda' },
    { name: 'blenderis', optional: true },
  ],
  steps: [
    {
      body: 'Nogriez bietēm lapas un noberz tās zem krāna',
      note: 'Nemizo: miza noies ar īkšķiem, kad bietes būs izvārītas un atdzisušas.',
      uses: ['bietes'],
      needs: [...NAZIS_UN_DELITIS],
    },
    {
      body: 'Ieliec bietes lielajā katlā un pārlej ar aukstu ūdeni plaukstas platumā virs tām',
      uses: ['bietes'],
      needs: ['liels katls'],
    },
    {
      body: 'Uzvāri uz lielas uguns, tad samazini līdz lēnai vārīšanai',
      minutes: 10,
      needs: ['liels katls'],
    },
    {
      body: 'Vāri, līdz nazis bietē ieiet bez pretestības',
      note: 'Mazām bietēm vajag ap 35 minūtēm, lielām gandrīz stundu. Pielej ūdeni, ja tas vairs nesedz bietes.',
      minutes: 45,
      uses: ['bietes'],
      needs: ['liels katls'],
      meanwhile: [
        {
          body: 'Ieliec olas mazajā katlā, pārlej ar aukstu ūdeni un uzvāri',
          uses: ['olas'],
          needs: ['mazs katls'],
        },
        {
          body: 'Vāri olas 9 minūtes, tad nolej ūdeni un atdzesē tās aukstā ūdenī',
          note: 'Auksts ūdens uzreiz novērš pelēko loku ap dzeltenumu.',
          minutes: 9,
          uses: ['olas'],
          needs: ['mazs katls'],
        },
        {
          body: 'Nomizo gurķi, ja miza ir cieta, un sagriez sīkos kubiņos',
          uses: ['gurķis'],
          needs: [...NAZIS_UN_DELITIS],
        },
        {
          body: 'Sasmalcini dilles, arī tievos kātiņus',
          uses: ['dilles'],
          needs: [...NAZIS_UN_DELITIS],
        },
        {
          body: 'Sagriez zaļos sīpolus plānos gredzenos, arī zaļo daļu',
          uses: ['zaļie sīpoli'],
          needs: [...NAZIS_UN_DELITIS],
        },
      ],
    },
    {
      body: 'Nolej bietēm ūdeni un ļauj tām atdzist, līdz vari turēt rokā',
      minutes: 15,
      uses: ['bietes'],
    },
    {
      body: 'Noberz bietēm mizu ar īkšķiem',
      note: 'Uzvelc priekšautu un dari to virs izlietnes. Biešu sula nemazgājas ārā.',
      uses: ['bietes'],
    },
    {
      body: 'Sarīvē bietes uz rīves rupjās puses',
      uses: ['bietes'],
      needs: ['rīve'],
      photo: { key: '0f1e2d3c4b5a69788796a5b4c3d2e1f0', file: 'grated.jpg' },
    },
    { body: 'Ielej kefīru lielajā bļodā', uses: ['kefīrs'], needs: ['liela bļoda'] },
    {
      body: 'Iemaisi kefīrā bietes, gurķi, dilles un zaļos sīpolus',
      note: 'Gludākai zupai sablenderē trešdaļu un iemaisi atpakaļ.',
      uses: ['bietes', 'gurķis', 'dilles', 'zaļie sīpoli', 'kefīrs'],
      needs: ['liela bļoda', 'blenderis'],
    },
    {
      body: 'Pieber sāli, pa ceļam garšojot',
      note: 'Tagad jābūt nedaudz par sāļu: atdzesējot garša pieklust.',
      uses: ['sāls'],
    },
    {
      body: 'Pārklāj un atdzesē vismaz stundu, labāk pa nakti',
      minutes: 60,
      needs: ['liela bļoda'],
    },
    {
      body: 'Nomizo olas un pārgriez katru uz pusēm',
      uses: ['olas'],
      needs: [...NAZIS_UN_DELITIS],
    },
    { body: 'Ielej zupu bļodās un katrā uzliec pusi olas', uses: ['olas'] },
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
          excluded: ['zaļie sīpoli'],
        },
      ])
      .returning();
    await db.insert(cookNotes).values([
      {
        recipeId,
        stepId: null,
        cookId: made?.id ?? null,
        body: 'Pusi citrona iespiežot beigās, zupa bija spirgtāka. Tā darīt atkal.',
      },
      {
        recipeId,
        stepId: stepId('Vāri, līdz nazis bietē ieiet bez pretestības'),
        cookId: null,
        body: 'Mazās bietes bija gatavas 35 minūtēs, ne 45.',
      },
    ]);
  },
};

/** Still a draft, so the list has a Draft chip to look at; the recipe itself is complete. */
const PLOVS: RecipeSpec = {
  title: 'Plovs',
  description:
    'Uzbeku rīsi ar jēru un burkāniem vienā katlā. Uzrakstīts pilnībā, bet gribu vēlreiz pārbaudīt rīsu laiku, pirms saucu par gatavu.',
  servings: 6,
  status: 'draft',
  cover: { key: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', file: 'plov.jpg' },
  ingredients: [
    { name: 'jēra plecs', amount: 600, unit: 'g', note: 'ar kaulu vai bez, ar taukiem' },
    { name: 'rīsi', amount: 500, unit: 'g', note: 'basmati, ja vari' },
    { name: 'burkāni', amount: 4, note: 'lieli' },
    { name: 'sīpoli', amount: 2 },
    { name: 'augu eļļa', amount: 100, unit: 'ml' },
    { name: 'ķiploki', amount: 1, note: 'vesela galviņa, nemizota' },
    { name: 'kumīna sēklas', amount: 2, unit: 'tsp' },
    { name: 'sāls', amount: 2, unit: 'tsp' },
    { name: 'melnie pipari', amount: 1, unit: 'tsp', note: 'svaigi malti' },
    { name: 'karsts ūdens', amount: 1.5, unit: 'l', note: 'no tējkannas' },
  ],
  equipment: [
    { name: 'smags katls ar vāku' },
    { name: 'ass nazis' },
    { name: 'dēlītis' },
    { name: 'siets' },
    { name: 'tējkanna' },
    { name: 'koka karote' },
  ],
  steps: [
    {
      body: 'Skalo rīsus sietā zem aukstā krāna, līdz ūdens tek dzidrs',
      note: 'Tas prasa ilgāk, nekā šķiet. Duļķains ūdens nozīmē, ka graudi salips.',
      uses: ['rīsi'],
      needs: ['siets'],
    },
    {
      body: 'Pārlej rīsus ar siltu ūdeni un atstāj mērcēties',
      minutes: 30,
      uses: ['rīsi'],
      meanwhile: [
        {
          body: 'Nomizo burkānus un sagriez tos sērkociņa resnuma salmiņos',
          note: 'Griez, nekad nerīvē: rīvēti burkāni izkūst rīsos, un plovs kļūst oranžs.',
          uses: ['burkāni'],
          needs: [...NAZIS_UN_DELITIS],
        },
        {
          body: 'Nomizo sīpolus un sagriez tos plānos pusmēnešos',
          uses: ['sīpoli'],
          needs: [...NAZIS_UN_DELITIS],
        },
        {
          body: 'Sagriez jēru valrieksta lieluma gabalos',
          note: 'Taukus atstāj. Tie ir tas, kas rīsiem dod garšu.',
          uses: ['jēra plecs'],
          needs: [...NAZIS_UN_DELITIS],
        },
        { body: 'Piepildi tējkannu un uzvāri', uses: ['karsts ūdens'], needs: ['tējkanna'] },
      ],
    },
    {
      body: 'Uzliec tukšo katlu uz lielas uguns, līdz ūdens piliens pa dibenu lēkā',
      minutes: 3,
      needs: ['smags katls ar vāku'],
    },
    {
      body: 'Ielej eļļu un karsē, līdz tā vizuļo un tikko sāk kūpēt',
      minutes: 2,
      uses: ['augu eļļa'],
      needs: ['smags katls ar vāku'],
    },
    {
      body: 'Ieliec jēru katlā vienā kārtā un neaiztiec, līdz apakša ir tumši brūna',
      note: 'Nemaisi un nepārpildi. Ja vienā kārtā neietilpst, dari divās reizēs.',
      minutes: 5,
      uses: ['jēra plecs'],
      needs: ['smags katls ar vāku'],
    },
    {
      body: 'Apgriez gabalus un apbrūnini pārējās puses',
      minutes: 5,
      uses: ['jēra plecs'],
      needs: ['koka karote'],
    },
    {
      body: 'Pievieno sīpolus un cep, maisot, līdz tie ir zeltaini',
      minutes: 8,
      uses: ['sīpoli'],
      needs: ['koka karote'],
    },
    {
      body: 'Pievieno burkānus un cep, līdz tie kļūst mīksti un malās sāk krāsoties',
      minutes: 10,
      uses: ['burkāni'],
      needs: ['koka karote'],
    },
    {
      body: 'Iemaisi kumīnu, sāli un piparus',
      uses: ['kumīna sēklas', 'sāls', 'melnie pipari'],
    },
    {
      body: 'Ielej karstu ūdeni, lai tikko nosedz gaļu, un iespied vidū veselo ķiploka galviņu',
      uses: ['karsts ūdens', 'ķiploki'],
      needs: ['tējkanna'],
    },
    {
      body: 'Sautē bez vāka, līdz jērs ir mīksts',
      note: 'Tas ir zirvaks, pamats. Tam jābūt nedaudz par sāļu, jo rīsi sāli paņems.',
      minutes: 40,
      uses: ['jēra plecs'],
      needs: ['smags katls ar vāku'],
    },
    {
      body: 'Nokās rīsus un izklāj tos pār gaļu vienmērīgā kārtā, nemaisot',
      note: 'No šī brīža rīsi paliek virsū. Ja tagad maisa, tie kļūst līpīgi.',
      uses: ['rīsi'],
      needs: ['siets'],
    },
    {
      body: 'Ielej karstu ūdeni, līdz tas stāv pirksta platumā virs rīsiem',
      note: 'Lej pār karotes muguru, lai ūdens neizrok rīsos bedri.',
      uses: ['karsts ūdens'],
      needs: ['tējkanna', 'koka karote'],
    },
    {
      body: 'Vāri strauji, līdz ūdens nogrimst zem rīsu virsmas',
      minutes: 10,
      needs: ['smags katls ar vāku'],
    },
    {
      body: 'Ar karotes kātu izdur caurumus līdz dibenam, samazini uguni uz mazāko, uzliec vāku',
      note: 'Caurumi laiž cauri tvaiku. Ietin vāku dvielī, ja tas neguļ cieši.',
      needs: ['koka karote', 'smags katls ar vāku'],
    },
    {
      body: 'Ļauj sutināties zem vāka, neskatoties iekšā',
      minutes: 25,
      needs: ['smags katls ar vāku'],
    },
    { body: 'Noņem katlu no uguns un ļauj pastāvēt zem vāka', minutes: 10 },
    {
      body: 'Izņem ķiploku, tad sajauc rīsus, burkānus un gaļu no apakšas uz augšu',
      uses: ['ķiploki'],
      needs: ['koka karote'],
    },
    { body: 'Sakrauj uz viena liela šķīvja, gaļu virsū, ķiploku vidū, un ēd ar rokām vai karoti' },
  ],
};

const RUPJMAIZE: RecipeSpec = {
  title: 'Vecmāmiņas rupjmaize',
  description:
    'Tumšs, blīvs klaips ar ķimenēm, tāds, kas stāv nedēļu. Ar raugu, ne ieraugu, lai var izcept tajā pašā dienā.',
  servings: 1,
  status: 'ready',
  cover: { key: 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6', file: 'bread.jpg' },
  ingredients: [
    { name: 'rudzu milti', amount: 500, unit: 'g', note: 'pilngraudu' },
    { name: 'kviešu milti', amount: 200, unit: 'g' },
    { name: 'ūdens', amount: 500, unit: 'ml', note: 'silts kā roka' },
    { name: 'sausais raugs', amount: 7, unit: 'g', note: 'viena paciņa' },
    { name: 'medus', amount: 2, unit: 'tbsp' },
    { name: 'sāls', amount: 2, unit: 'tsp' },
    { name: 'ķimenes', amount: 1, unit: 'tbsp' },
    { name: 'sviests', amount: 10, unit: 'g', note: 'formai' },
  ],
  equipment: [
    { name: 'liela bļoda' },
    { name: 'maza krūze' },
    { name: 'koka karote' },
    { name: 'maizes forma' },
    { name: 'dvielis' },
    { name: 'cepeškrāsns' },
    { name: 'režģis' },
  ],
  steps: [
    {
      body: 'Sasildi ūdeni krūzē, līdz tas uz plaukstas locītavas jūtas kā silta vanna',
      note: 'Par karstu nogalina raugu. Ja nevari noturēt pirkstu, pagaidi.',
      uses: ['ūdens'],
      needs: ['maza krūze'],
    },
    {
      body: 'Iemaisi ūdenī medu un raugu un atstāj, līdz virsū parādās putas',
      minutes: 10,
      uses: ['medus', 'sausais raugs', 'ūdens'],
      needs: ['maza krūze'],
      meanwhile: [
        {
          body: 'Ieber lielajā bļodā abus miltus un sāli un samaisi ar roku',
          uses: ['rudzu milti', 'kviešu milti', 'sāls'],
          needs: ['liela bļoda'],
        },
        { body: 'Ieziež maizes formu ar sviestu', uses: ['sviests'], needs: ['maizes forma'] },
      ],
    },
    {
      body: 'Ielej rauga ūdeni miltos un maisi, līdz nepaliek sausu miltu',
      note: 'Būs līpīga, vairāk kā biezi dubļi nekā maizes mīkla. Rudziem tā ir pareizi.',
      uses: ['ūdens'],
      needs: ['liela bļoda', 'koka karote'],
    },
    {
      body: 'Samitrini roku un mīci mīklu bļodā, locot to pāri pašai sev',
      note: 'Rudziem nav stiepjamības, tāpēc nav ko mīcīt. Tu tikai labi samaisi.',
      minutes: 5,
      needs: ['liela bļoda'],
    },
    {
      body: 'Pārklāj bļodu ar dvieli un atstāj siltā vietā, līdz mīkla izskatās uzpūtusies',
      minutes: 90,
      needs: ['liela bļoda', 'dvielis'],
    },
    {
      body: 'Iemaisi mīklā ķimenes ar karoti',
      uses: ['ķimenes'],
      needs: ['koka karote'],
    },
    {
      body: 'Iekaraj mīklu formā un nolīdzini virsu ar slapju roku',
      needs: ['maizes forma'],
    },
    {
      body: 'Pārklāj formu un atstāj, līdz mīkla sasniedz malu',
      minutes: 45,
      needs: ['maizes forma', 'dvielis'],
      meanwhile: [
        {
          body: 'Uzkarsē cepeškrāsni līdz 220 grādiem ar režģi vidū',
          minutes: 20,
          needs: ['cepeškrāsns'],
        },
      ],
    },
    {
      body: 'Nosmērē virsu ar ūdeni un liec formu cepeškrāsnī',
      uses: ['ūdens'],
      needs: ['cepeškrāsns', 'maizes forma'],
    },
    {
      body: 'Cep, līdz garoza ir tumša un klaips, pa apakšu uzsitot, skan dobji',
      minutes: 45,
      needs: ['cepeškrāsns'],
    },
    {
      body: 'Izgāz klaipu uz režģa un ļauj tam pilnībā atdzist, pirms griez',
      note: 'Griežot siltu, vidus kļūst gumijains. Vislabāk pa nakti ietītu dvielī.',
      minutes: 120,
      needs: ['režģis', 'dvielis'],
    },
  ],
};

const PELEKIE_ZIRNI: RecipeSpec = {
  title: 'Pelēkie zirņi ar speķi',
  description:
    'Latviešu ziemas vakariņas. Iemērc zirņus iepriekšējā vakarā, un pārējais ir pacietība.',
  servings: 4,
  status: 'ready',
  featured: true,
  cover: { key: 'd0e1f2a3b4c5d6e7f8091a2b3c4d5e6f', file: 'peas.jpg' },
  ingredients: [
    { name: 'kaltēti pelēkie zirņi', amount: 500, unit: 'g' },
    { name: 'kūpināts speķis', amount: 200, unit: 'g', note: 'ar gaļas kārtām, vienā gabalā' },
    { name: 'sīpoli', amount: 2 },
    { name: 'sviests', amount: 30, unit: 'g' },
    { name: 'sāls', note: 'pēc garšas' },
    { name: 'kefīrs', amount: 500, unit: 'ml', note: 'dzeršanai klāt' },
  ],
  equipment: [
    { name: 'liela bļoda' },
    { name: 'caurduris' },
    { name: 'liels katls' },
    { name: 'panna' },
    { name: 'ass nazis' },
    { name: 'dēlītis' },
    { name: 'koka karote' },
  ],
  steps: [
    {
      body: 'Iepriekšējā vakarā ieber zirņus lielajā bļodā un pārlej ar aukstu ūdeni divu pirkstu platumā virs tiem',
      note: 'Tie uzbriest divkārt. Ņem lielāku bļodu, nekā šķiet vajadzīgs. Bez laika: tas ir iepriekšējā vakarā.',
      uses: ['kaltēti pelēkie zirņi'],
      needs: ['liela bļoda'],
    },
    {
      body: 'Nokās zirņus caurdurī un noskalo zem aukstā krāna',
      uses: ['kaltēti pelēkie zirņi'],
      needs: ['caurduris'],
    },
    {
      body: 'Ieber zirņus lielajā katlā un pārlej ar svaigu aukstu ūdeni plaukstas platumā virs tiem',
      uses: ['kaltēti pelēkie zirņi'],
      needs: ['liels katls'],
    },
    {
      body: 'Uzvāri uz lielas uguns un nosmel pelēkās putas',
      minutes: 10,
      needs: ['liels katls', 'koka karote'],
    },
    {
      body: 'Samazini uguni un lēni vāri, līdz zirņi ir mīksti cauri',
      note: 'Sāli vēl ne, citādi miziņas paliek cietas. Iekod vienā: tam jāpadodas bez krīta vidū.',
      minutes: 90,
      uses: ['kaltēti pelēkie zirņi'],
      needs: ['liels katls'],
      meanwhile: [
        {
          body: 'Sagriez speķi ap centimetru lielos kubiņos',
          uses: ['kūpināts speķis'],
          needs: [...NAZIS_UN_DELITIS],
        },
        {
          body: 'Nomizo sīpolus un sagriez tikpat lielos kubiņos',
          uses: ['sīpoli'],
          needs: [...NAZIS_UN_DELITIS],
        },
        {
          body: 'Uzliec pannu uz vidējas uguns bez nekā',
          minutes: 2,
          needs: ['panna'],
        },
        {
          body: 'Ieber speķi un cep, laiku pa laikam pamaisot, līdz tas ir kraukšķīgs un tauki izkusuši',
          minutes: 10,
          uses: ['kūpināts speķis'],
          needs: ['panna', 'koka karote'],
        },
        {
          body: 'Pievieno sviestu un sīpolus un cep, līdz sīpoli ir mīksti un zeltaini',
          minutes: 8,
          uses: ['sviests', 'sīpoli'],
          needs: ['panna', 'koka karote'],
        },
      ],
    },
    {
      body: 'Nokās zirņus caurdurī, paturot tasi vārīšanas ūdens',
      uses: ['kaltēti pelēkie zirņi'],
      needs: ['caurduris'],
    },
    {
      body: 'Ieber zirņus atpakaļ katlā un iemaisi speķi un sīpolus ar visiem taukiem',
      uses: ['kaltēti pelēkie zirņi', 'kūpināts speķis', 'sīpoli'],
      needs: ['liels katls', 'koka karote'],
    },
    {
      body: 'Pieber sāli pēc garšas un, ja izskatās sauss, pielej šļakatu vārīšanas ūdens',
      uses: ['sāls'],
    },
    { body: 'Pasniedz karstus bļodās, katram ar glāzi auksta kefīra', uses: ['kefīrs'] },
  ],
};

const SKLANDRAUSIS: RecipeSpec = {
  title: 'Sklandrausis',
  description:
    'Vaļēji rudzu mīklas raušļi no Kurzemes ar kartupeļu kārtu apakšā un saldu burkānu kārtu virsū. Mazi, un labāki nedaudz silti.',
  servings: 8,
  status: 'ready',
  featured: true,
  cover: { key: 'e1f2a3b4c5d6e7f8091a2b3c4d5e6f70', file: 'sklandrausis.jpg' },
  ingredients: [
    { name: 'rudzu milti', amount: 300, unit: 'g' },
    { name: 'ūdens', amount: 150, unit: 'ml', note: 'silts' },
    { name: 'sviests', amount: 50, unit: 'g', note: 'izkausēts' },
    { name: 'sāls', amount: 1, unit: 'tsp' },
    { name: 'kartupeļi', amount: 400, unit: 'g' },
    { name: 'burkāni', amount: 500, unit: 'g' },
    { name: 'olas', amount: 2, unit: 'piece' },
    { name: 'skābais krējums', amount: 100, unit: 'ml', note: 'un nedaudz apziešanai' },
    { name: 'cukurs', amount: 2, unit: 'tbsp' },
    { name: 'ķimenes', amount: 1, unit: 'tsp' },
  ],
  equipment: [
    { name: 'liela bļoda' },
    { name: 'divi mazi katli' },
    { name: 'kartupeļu stampa' },
    { name: 'mīklas rullis' },
    { name: 'cepešpanna' },
    { name: 'cepampapīrs' },
    { name: 'cepeškrāsns' },
    { name: 'otiņa' },
    { name: 'apaļa forma', optional: true },
  ],
  steps: [
    {
      body: 'Samaisi lielajā bļodā rudzu miltus un sāli, tad ielej silto ūdeni un izkausēto sviestu',
      uses: ['rudzu milti', 'sāls', 'ūdens', 'sviests'],
      needs: ['liela bļoda'],
    },
    {
      body: 'Savel ar rokām stingrā mīklā, tad pārklāj un ļauj atpūsties',
      note: 'Rudziem nav stiepjamības. Tai jājūtas kā mālam, ne kā maizes mīklai.',
      minutes: 30,
      needs: ['liela bļoda'],
      meanwhile: [
        {
          body: 'Nomizo kartupeļus, sagriez gabalos un vāri sālītā ūdenī, līdz mīksti',
          minutes: 20,
          uses: ['kartupeļi'],
          needs: ['divi mazi katli'],
        },
        {
          body: 'Nomizo burkānus, sagriez šķēlēs un vāri otrā katlā, līdz mīksti',
          minutes: 20,
          uses: ['burkāni'],
          needs: ['divi mazi katli'],
        },
        {
          body: 'Nokās kartupeļus un sastampā ar vienu olu un karoti skābā krējuma',
          uses: ['kartupeļi', 'olas', 'skābais krējums'],
          needs: ['kartupeļu stampa'],
        },
        {
          body: 'Nokās burkānus un sastampā ar cukuru, otru olu, atlikušo skābo krējumu un ķimenēm',
          uses: ['burkāni', 'cukurs', 'olas', 'skābais krējums', 'ķimenes'],
          needs: ['kartupeļu stampa'],
        },
        {
          body: 'Uzkarsē cepeškrāsni līdz 200 grādiem un izklāj cepešpannu ar cepampapīru',
          minutes: 15,
          needs: ['cepeškrāsns', 'cepešpanna', 'cepampapīrs'],
        },
      ],
    },
    {
      body: 'Izrullē mīklu plānu uz miltotas virsmas, apmēram monētas biezumā',
      uses: ['rudzu milti'],
      needs: ['mīklas rullis'],
    },
    {
      body: 'Izgriez apakštasītes lieluma ripas un pārliec tās uz cepešpannas',
      needs: ['apaļa forma', 'cepešpanna'],
    },
    {
      body: 'Katrai ripai uzloki malu pirksta augstumā',
      note: 'Mala notur pildījumu. Taisi to nedaudz augstāku, nekā šķiet vajadzīgs; cepeškrāsnī tā nosēžas.',
    },
    {
      body: 'Katrā ieklāj kārtu kartupeļu, tad burkānus virsū, līdz pašai malai',
      uses: ['kartupeļi', 'burkāni'],
    },
    {
      body: 'Cep, līdz malas ir cietas un burkāni sacietējuši ar dažiem tumšiem plankumiem',
      minutes: 20,
      needs: ['cepeškrāsns', 'cepešpanna'],
    },
    {
      body: 'Kamēr karsti, apziež virsu ar skābo krējumu',
      uses: ['skābais krējums'],
      needs: ['otiņa'],
    },
    { body: 'Ļauj nedaudz atdzist uz pannas un ēd siltus', minutes: 10 },
  ],
};

const PANKUKAS: RecipeSpec = {
  title: 'Pankūkas',
  description:
    'Plānās pankūkas, ikdienas. Ēd ar ievārījumu, ar skābo krējumu vai satītas ap to, kas ir ledusskapī.',
  servings: 4,
  status: 'ready',
  featured: true,
  cover: { key: 'f2a3b4c5d6e7f8091a2b3c4d5e6f7081', file: 'pancakes.jpg' },
  ingredients: [
    { name: 'olas', amount: 2, unit: 'piece' },
    { name: 'piens', amount: 500, unit: 'ml' },
    { name: 'kviešu milti', amount: 250, unit: 'g' },
    { name: 'cukurs', amount: 1, unit: 'tbsp' },
    { name: 'sāls', amount: 1, unit: 'pinch' },
    { name: 'sviests', amount: 50, unit: 'g', note: 'puse izkausēta mīklai, puse pannai' },
    { name: 'ievārījums', note: 'pasniegšanai' },
  ],
  equipment: [
    { name: 'liela bļoda' },
    { name: 'putojamā slotiņa' },
    { name: 'mazs katls' },
    { name: 'panna' },
    { name: 'kauss' },
    { name: 'lāpstiņa' },
    { name: 'šķīvis' },
  ],
  steps: [
    {
      body: 'Izkausē pusi sviesta mazajā katlā uz mazas uguns un noliec atdzist',
      uses: ['sviests'],
      needs: ['mazs katls'],
    },
    {
      body: 'Iesit olas lielajā bļodā un saputo ar cukuru un sāli, līdz gaišas',
      uses: ['olas', 'cukurs', 'sāls'],
      needs: ['liela bļoda', 'putojamā slotiņa'],
    },
    { body: 'Ieputo pienu', uses: ['piens'], needs: ['putojamā slotiņa'] },
    {
      body: 'Pa saujai pieber miltus, putojot, līdz mīkla ir gluda un šķidra kā krējums',
      note: 'Ja ir kunkuļi, puto tālāk; tie pazūd. Par biezu, un pankūkas sanāk smagas.',
      uses: ['kviešu milti'],
      needs: ['putojamā slotiņa'],
    },
    { body: 'Ieputo izkausēto sviestu', uses: ['sviests'], needs: ['putojamā slotiņa'] },
    {
      body: 'Ļauj mīklai atpūsties',
      note: 'Atpūta ļauj miltiem uzbriest, un tieši tas neļauj pirmajai pankūkai plīst.',
      minutes: 20,
      needs: ['liela bļoda'],
      meanwhile: [
        {
          body: 'Uzliec pannu uz vidēji lielas uguns, līdz ūdens piliens pa to lēkā',
          minutes: 3,
          needs: ['panna'],
        },
      ],
    },
    {
      body: 'Ar papīra dvieļa gabaliņu ieziež pannu ar nedaudz sviesta',
      uses: ['sviests'],
      needs: ['panna'],
    },
    {
      body: 'Ielej mazu kausu mīklas un uzreiz pagāz pannu, lai tā aiztek līdz malām',
      note: 'Pirmā vienmēr ir dīvaina. Apēd to stāvot.',
      uses: ['kviešu milti'],
      needs: ['panna', 'kauss'],
    },
    {
      body: 'Cep, līdz malas atlobās un virsa no slapjas kļūst matēta, tad apgriez ar lāpstiņu',
      minutes: 1,
      needs: ['panna', 'lāpstiņa'],
    },
    {
      body: 'Cep otru pusi pusminūti, tad noslidini uz šķīvja',
      minutes: 1,
      needs: ['panna', 'lāpstiņa', 'šķīvis'],
    },
    {
      body: 'Turpini, ik pēc dažām pankūkām ieziežot pannu ar sviestu, un krauj tās uz šķīvja',
      minutes: 12,
      uses: ['sviests'],
      needs: ['panna', 'kauss', 'lāpstiņa', 'šķīvis'],
    },
    { body: 'Pasniedz siltas, satītas vai salocītas, ar ievārījumu', uses: ['ievārījums'] },
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
  await seedRecipe(db, janis, AUKSTA_ZUPA);
  await seedRecipe(db, janis, PLOVS);
  await seedRecipe(db, anna, RUPJMAIZE);
  for (const spec of [PELEKIE_ZIRNI, SKLANDRAUSIS, PANKUKAS]) await seedRecipe(db, panna, spec);

  await sql.end();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
