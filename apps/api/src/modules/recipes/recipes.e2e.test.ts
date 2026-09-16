import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import {
  API_PREFIX,
  ERROR_CODES,
  errorBodySchema,
  recipeListSchema,
  recipeSchema,
  sessionSchema,
} from '@panna/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ErrorFilter } from '../../common/error.filter.js';
import { validateEnv } from '../../config/env.js';
import { DatabaseModule } from '../../db/database.module.js';
import { recipes, users } from '../../db/schema/index.js';
import { db } from '../../test/db.js';
import { AuthModule } from '../auth/auth.module.js';

import { RecipesModule } from './recipes.module.js';

const ALICE = { email: 'alice@example.com', displayName: 'Alice' };
const BOB = { email: 'bob@example.com', displayName: 'Bob' };
const NOBODY = '00000000-0000-4000-8000-000000000000';

const asRecipe = (res: request.Response) => recipeSchema.parse(res.body);
const asList = (res: request.Response) => recipeListSchema.parse(res.body);
const asError = (res: request.Response) => errorBodySchema.parse(res.body);

const VALID = { title: 'Cold beetroot soup', servings: 4 };

describe('recipes, end to end', () => {
  let app: NestExpressApplication;
  let jwt: JwtService;
  let alice: string;
  let bob: string;

  beforeAll(async () => {
    const env = validateEnv({ ...process.env, ALLOW_DEV_SIGN_IN: 'true' });
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
        DatabaseModule,
        AuthModule.register(env),
        RecipesModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalFilters(new ErrorFilter());
    await app.init();
    jwt = app.get(JwtService, { strict: false });
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  async function tokenFor(email: string): Promise<string> {
    const res = await server().post('/api/auth/dev-session').send({ email });
    return sessionSchema.parse(res.body).accessToken;
  }

  beforeEach(async () => {
    await db.insert(users).values([ALICE, BOB]);
    alice = await tokenFor(ALICE.email);
    bob = await tokenFor(BOB.email);
  });

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function create(token: string, body: object = VALID) {
    return server().post('/api/recipes').set(as(token)).send(body);
  }

  describe('authentication', () => {
    it('refuses every endpoint without a token', async () => {
      expect((await server().get('/api/recipes')).status).toBe(401);
      expect((await server().post('/api/recipes').send(VALID)).status).toBe(401);
      expect((await server().get(`/api/recipes/${NOBODY}`)).status).toBe(401);
      expect((await server().patch(`/api/recipes/${NOBODY}`).send({ title: 'x' })).status).toBe(
        401,
      );
      expect((await server().delete(`/api/recipes/${NOBODY}`)).status).toBe(401);
    });

    it('refuses every endpoint with an expired token', async () => {
      const [user] = await db.select().from(users).where(eq(users.email, ALICE.email));
      if (user === undefined) throw new Error('no user');
      const expired = jwt.sign({ sub: user.id }, { expiresIn: -10 });

      const list = await server().get('/api/recipes').set(as(expired));
      expect(list.status).toBe(401);
      expect(asError(list).code).toBe(ERROR_CODES.AUTH_TOKEN_EXPIRED);
      expect((await create(expired)).status).toBe(401);
      expect((await server().get(`/api/recipes/${NOBODY}`).set(as(expired))).status).toBe(401);
      expect(
        (await server().patch(`/api/recipes/${NOBODY}`).set(as(expired)).send({ title: 'x' }))
          .status,
      ).toBe(401);
      expect((await server().delete(`/api/recipes/${NOBODY}`).set(as(expired))).status).toBe(401);
    });
  });

  describe('create', () => {
    it('returns 201 with exactly the eight response keys, as a draft', async () => {
      const res = await create(alice);
      expect(res.status).toBe(201);
      expect(Object.keys(res.body as object).sort()).toEqual(
        [
          'createdAt',
          'description',
          'id',
          'servings',
          'status',
          'title',
          'totalTimeMinutes',
          'updatedAt',
        ].sort(),
      );
      const recipe = asRecipe(res);
      expect(recipe.status).toBe('draft');
      expect(recipe.description).toBeNull();
      expect(recipe.totalTimeMinutes).toBeNull();
    });

    it('rejects a blank title and creates nothing', async () => {
      const res = await create(alice, { ...VALID, title: '   ' });
      expect(res.status).toBe(400);
      expect(asError(res).code).toBe(ERROR_CODES.VALIDATION_FAILED);
      expect(await db.select().from(recipes)).toHaveLength(0);
    });

    it.each([0, 1.5])('rejects servings of %s', async (servings) => {
      expect((await create(alice, { ...VALID, servings })).status).toBe(400);
    });

    it('rejects a body that tries to set status', async () => {
      const res = await create(alice, { ...VALID, status: 'ready' });
      expect(res.status).toBe(400);
      expect(asError(res).fields).toHaveProperty('status');
    });
  });

  describe('list', () => {
    it('is empty, not a 404, for a user with nothing', async () => {
      const res = await server().get('/api/recipes').set(as(alice));
      expect(res.status).toBe(200);
      expect(asList(res)).toEqual([]);
    });

    it('shows each user only their own', async () => {
      await create(alice, { ...VALID, title: 'Alice one' });
      await create(alice, { ...VALID, title: 'Alice two' });
      await create(bob, { ...VALID, title: 'Bob one' });

      const alices = asList(await server().get('/api/recipes').set(as(alice)));
      expect(alices.map((r) => r.title).sort()).toEqual(['Alice one', 'Alice two']);
      const bobs = asList(await server().get('/api/recipes').set(as(bob)));
      expect(bobs.map((r) => r.title)).toEqual(['Bob one']);
    });

    it('puts the most recently updated first', async () => {
      const first = asRecipe(await create(alice, { ...VALID, title: 'First' }));
      const second = asRecipe(await create(alice, { ...VALID, title: 'Second' }));
      let order = asList(await server().get('/api/recipes').set(as(alice))).map((r) => r.id);
      expect(order).toEqual([second.id, first.id]);

      const patched = await server()
        .patch(`/api/recipes/${first.id}`)
        .set(as(alice))
        .send({ title: 'First, revised' });
      expect(new Date(asRecipe(patched).updatedAt).getTime()).toBeGreaterThan(
        new Date(first.updatedAt).getTime(),
      );
      order = asList(await server().get('/api/recipes').set(as(alice))).map((r) => r.id);
      expect(order).toEqual([first.id, second.id]);
    });
  });

  describe('ownership', () => {
    it('answers 404 for another user, identically to an id that does not exist', async () => {
      const mine = asRecipe(await create(alice));
      const missing = await server().get(`/api/recipes/${NOBODY}`).set(as(bob));
      expect(missing.status).toBe(404);

      const get = await server().get(`/api/recipes/${mine.id}`).set(as(bob));
      const patch = await server()
        .patch(`/api/recipes/${mine.id}`)
        .set(as(bob))
        .send({ title: 'Stolen' });
      const del = await server().delete(`/api/recipes/${mine.id}`).set(as(bob));

      for (const res of [get, patch, del]) {
        expect(res.status).toBe(404);
        expect(res.body).toEqual(missing.body);
        expect(asError(res).code).toBe(ERROR_CODES.RECIPE_NOT_FOUND);
      }
    });

    it('leaves a row untouched, updatedAt included, when a patch is refused', async () => {
      const mine = asRecipe(await create(alice));
      const [before] = await db.select().from(recipes).where(eq(recipes.id, mine.id));
      await server().patch(`/api/recipes/${mine.id}`).set(as(bob)).send({ title: 'Stolen' });
      const [after] = await db.select().from(recipes).where(eq(recipes.id, mine.id));
      expect(after).toEqual(before);
    });

    it('treats a malformed id as not found rather than as a server error', async () => {
      const res = await server().get('/api/recipes/not-a-uuid').set(as(alice));
      expect(res.status).toBe(404);
    });
  });

  describe('update', () => {
    it('rejects an empty body', async () => {
      const mine = asRecipe(await create(alice));
      const res = await server().patch(`/api/recipes/${mine.id}`).set(as(alice)).send({});
      expect(res.status).toBe(400);
    });

    it('moves a recipe from draft to ready and back', async () => {
      const mine = asRecipe(await create(alice));
      const ready = await server()
        .patch(`/api/recipes/${mine.id}`)
        .set(as(alice))
        .send({ status: 'ready' });
      expect(asRecipe(ready).status).toBe('ready');
      const draft = await server()
        .patch(`/api/recipes/${mine.id}`)
        .set(as(alice))
        .send({ status: 'draft' });
      expect(asRecipe(draft).status).toBe('draft');
    });

    it('clears the description with null, and refuses a null title', async () => {
      const mine = asRecipe(await create(alice, { ...VALID, description: 'Chilled, pink.' }));
      const cleared = await server()
        .patch(`/api/recipes/${mine.id}`)
        .set(as(alice))
        .send({ description: null });
      expect(asRecipe(cleared).description).toBeNull();

      const refused = await server()
        .patch(`/api/recipes/${mine.id}`)
        .set(as(alice))
        .send({ title: null });
      expect(refused.status).toBe(400);
    });
  });

  describe('delete', () => {
    it('returns 204, and a second delete is a 404', async () => {
      const mine = asRecipe(await create(alice));
      const first = await server().delete(`/api/recipes/${mine.id}`).set(as(alice));
      expect(first.status).toBe(204);
      expect(first.body).toEqual({});

      const second = await server().delete(`/api/recipes/${mine.id}`).set(as(alice));
      expect(second.status).toBe(404);
      expect(asList(await server().get('/api/recipes').set(as(alice)))).toEqual([]);
    });
  });
});
