import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import {
  API_PREFIX,
  ERROR_CODES,
  errorBodySchema,
  recipeDetailSchema,
  recipeListSchema,
  sessionSchema,
  sharedRecipeSchema,
  uploadedImageSchema,
  type RecipeDetail,
} from '@panna/shared';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ErrorFilter } from '../../common/error.filter.js';
import { validateEnv } from '../../config/env.js';
import { DatabaseModule } from '../../db/database.module.js';
import { recipes, users } from '../../db/schema/index.js';
import { db } from '../../test/db.js';
import { AuthModule } from '../auth/auth.module.js';
import { ImagesModule } from '../images/images.module.js';
import { RecipesModule } from '../recipes/recipes.module.js';

import { FeaturedModule } from './featured.module.js';

const PANNA = { email: 'panna@example.com', displayName: 'Panna' };
const BOB = { email: 'bob@example.com', displayName: 'Bob' };

describe('featured, end to end', () => {
  let app: NestExpressApplication;
  let panna: string;
  let bob: string;

  beforeAll(async () => {
    const env = validateEnv({ ...process.env, ALLOW_DEV_SIGN_IN: 'true' });
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
        DatabaseModule,
        AuthModule.register(env),
        ImagesModule,
        RecipesModule,
        FeaturedModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalFilters(new ErrorFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const asDetail = (res: request.Response) => recipeDetailSchema.parse(res.body);
  const asError = (res: request.Response) => errorBodySchema.parse(res.body);

  async function tokenFor(email: string): Promise<string> {
    const res = await server().post('/api/auth/dev-session').send({ email });
    return sessionSchema.parse(res.body).accessToken;
  }
  async function photo(token: string): Promise<string> {
    const bytes = await sharp({
      create: { width: 40, height: 30, channels: 3, background: '#ca3' },
    })
      .png()
      .toBuffer();
    const res = await server().post('/api/images').set(as(token)).attach('file', bytes, 'p.png');
    return uploadedImageSchema.parse(res.body).key;
  }
  /** A recipe of Panna's, ready or not, with a photo, lists, a nested step and links. */
  async function recipe(title: string, status: 'draft' | 'ready'): Promise<RecipeDetail> {
    const cover = await photo(panna);
    const created = asDetail(
      await server()
        .post('/api/recipes')
        .set(as(panna))
        .send({
          title,
          servings: 4,
          coverImageKey: cover,
          ingredients: [{ name: 'Flour', amount: 250, unit: 'g' }, { name: 'Milk' }],
          equipment: [{ name: 'Pan' }],
        }),
    );
    const [flour, milk] = created.ingredients.map((i) => i.id);
    return asDetail(
      await server()
        .patch(`/api/recipes/${created.id}`)
        .set(as(panna))
        .send({
          status,
          steps: [
            {
              body: 'Whisk',
              ingredientIds: [flour, milk],
              equipmentIds: [created.equipment[0]?.id],
              children: [{ body: 'Heat the pan', equipmentIds: [created.equipment[0]?.id] }],
            },
            { body: 'Fry' },
          ],
        }),
    );
  }
  async function feature(id: string): Promise<void> {
    // Only the database sets this; the app has no way to, on purpose.
    await db.update(recipes).set({ featured: true }).where(eq(recipes.id, id));
  }

  beforeEach(async () => {
    await db.insert(users).values([PANNA, BOB]);
    panna = await tokenFor(PANNA.email);
    bob = await tokenFor(BOB.email);
  });

  /** The criterion: featured and ready only, by title; a typo still finds; blank is all; long is 400. */
  it('lists the featured ready recipes by title, and searches by title with a typo', async () => {
    const pancakes = await recipe('Pankūkas', 'ready');
    const peas = await recipe('Grey peas with bacon', 'ready');
    const draft = await recipe('Half-written', 'draft');
    await feature(pancakes.id);
    await feature(peas.id);
    await feature(draft.id);
    await recipe('Unfeatured but ready', 'ready');

    const all = await server().get('/api/featured').set(as(bob));
    expect(all.status).toBe(200);
    expect(recipeListSchema.parse(all.body).map((r) => r.title)).toEqual([
      'Grey peas with bacon',
      'Pankūkas',
    ]);
    const typo = recipeListSchema.parse(
      (await server().get('/api/featured').query({ q: 'pankukas' }).set(as(bob))).body,
    );
    expect(typo.map((r) => r.title)).toEqual(['Pankūkas']);
    const part = recipeListSchema.parse(
      (await server().get('/api/featured').query({ q: 'PEAS' }).set(as(bob))).body,
    );
    expect(part.map((r) => r.title)).toEqual(['Grey peas with bacon']);
    const blank = recipeListSchema.parse(
      (await server().get('/api/featured').query({ q: '  ' }).set(as(bob))).body,
    );
    expect(blank).toHaveLength(2);
    expect(
      recipeListSchema.parse(
        (await server().get('/api/featured').query({ q: 'zzzz' }).set(as(bob))).body,
      ),
    ).toEqual([]);
    const long = await server()
      .get('/api/featured')
      .query({ q: 'x'.repeat(81) })
      .set(as(bob));
    expect(long.status).toBe(400);
    expect(asError(long).code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect((await server().get('/api/featured')).status).toBe(401);
  });

  /** The criterion: readable by a stranger, without the author's history; unfeatured is 404. */
  it('serves a featured recipe read-only to anyone signed in, and hides the rest', async () => {
    const pancakes = await recipe('Pankūkas', 'ready');
    await feature(pancakes.id);
    const res = await server().get(`/api/featured/${pancakes.id}`).set(as(bob));
    expect(res.status).toBe(200);
    const shared = sharedRecipeSchema.parse(res.body);
    expect(shared.authorName).toBe('Panna');
    expect(shared.steps[0]?.children[0]?.body).toBe('Heat the pan');
    expect(res.body).not.toHaveProperty('notes');
    expect(res.body).not.toHaveProperty('cookCount');

    const plain = await recipe('Not featured', 'ready');
    const hidden = await server().get(`/api/featured/${plain.id}`).set(as(bob));
    expect(hidden.status).toBe(404);
    expect(asError(hidden).code).toBe(ERROR_CODES.RECIPE_NOT_FOUND);
    expect((await server().get('/api/featured/not-an-id').set(as(bob))).status).toBe(404);
  });

  /** The criterion: the same copy a share makes, under new ids and keys; unfeatured is 404. */
  it('copies a featured recipe to whoever saves it', async () => {
    const pancakes = await recipe('Pankūkas', 'ready');
    await feature(pancakes.id);
    const saved = await server().post(`/api/featured/${pancakes.id}/save`).set(as(bob));
    expect(saved.status).toBe(201);
    const copy = asDetail(saved);
    expect(copy.id).not.toBe(pancakes.id);
    expect(copy.status).toBe('draft');
    expect(copy.sourceRecipeId).toBe(pancakes.id);
    expect(copy.title).toBe('Pankūkas');
    expect(copy.ingredients.map((i) => i.name)).toEqual(['Flour', 'Milk']);
    expect(copy.steps.map((s) => [s.body, s.children.map((c) => c.body)])).toEqual([
      ['Whisk', ['Heat the pan']],
      ['Fry', []],
    ]);
    expect(copy.steps[0]?.ingredientIds).toEqual(copy.ingredients.map((i) => i.id));
    expect(copy.steps[0]?.children[0]?.equipmentIds).toEqual([copy.equipment[0]?.id]);
    expect(copy.coverImageKey).not.toBe(pancakes.coverImageKey);
    expect(copy.coverImageKey).not.toBeNull();
    expect(
      recipeListSchema.parse((await server().get('/api/recipes').set(as(bob))).body),
    ).toHaveLength(1);
    // The original is untouched and still featured.
    expect(
      recipeListSchema.parse((await server().get('/api/featured').set(as(bob))).body),
    ).toHaveLength(1);

    const plain = await recipe('Not featured', 'ready');
    expect((await server().post(`/api/featured/${plain.id}/save`).set(as(bob))).status).toBe(404);
  });
});
