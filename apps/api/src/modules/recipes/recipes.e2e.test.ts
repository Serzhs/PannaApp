import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import {
  API_PREFIX,
  ERROR_CODES,
  MAX_EQUIPMENT,
  MAX_INGREDIENTS,
  errorBodySchema,
  recipeDetailSchema,
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
import { equipment, ingredients, recipes, users } from '../../db/schema/index.js';
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

describe('what a recipe needs, end to end', () => {
  let app: NestExpressApplication;
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
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const asDetail = (res: request.Response) => recipeDetailSchema.parse(res.body);

  async function tokenFor(email: string): Promise<string> {
    const res = await server().post('/api/auth/dev-session').send({ email });
    return sessionSchema.parse(res.body).accessToken;
  }

  async function freshRecipe(token: string): Promise<string> {
    const res = await server().post('/api/recipes').set(as(token)).send(VALID);
    return recipeSchema.parse(res.body).id;
  }

  const patch = (token: string, id: string, body: object) =>
    server().patch(`/api/recipes/${id}`).set(as(token)).send(body);

  const THREE = [
    { name: 'Beetroot', amount: 500, unit: 'g' },
    { name: 'Kefir', amount: 1, unit: 'l', note: 'cold' },
    { name: 'Dill', note: 'to taste' },
  ];
  const TWO = [{ name: 'Large bowl' }, { name: 'Grater', optional: true }];

  beforeEach(async () => {
    await db.insert(users).values([ALICE, BOB]);
    alice = await tokenFor(ALICE.email);
    bob = await tokenFor(BOB.email);
  });

  it('starts empty, and the list endpoint never carries the lists', async () => {
    const id = await freshRecipe(alice);
    const detail = asDetail(await server().get(`/api/recipes/${id}`).set(as(alice)));
    expect(detail.ingredients).toEqual([]);
    expect(detail.equipment).toEqual([]);

    const list = await server().get('/api/recipes').set(as(alice));
    expect(JSON.stringify(list.body)).not.toContain('ingredients');
  });

  it('stores both lists in order, numbered from zero', async () => {
    const id = await freshRecipe(alice);
    const res = await patch(alice, id, { ingredients: THREE, equipment: TWO });
    expect(res.status).toBe(200);
    const detail = asDetail(res);
    expect(detail.ingredients.map((i) => [i.position, i.name, i.amount, i.unit, i.note])).toEqual([
      [0, 'Beetroot', 500, 'g', null],
      [1, 'Kefir', 1, 'l', 'cold'],
      [2, 'Dill', null, null, 'to taste'],
    ]);
    expect(detail.equipment.map((e) => [e.position, e.name, e.optional])).toEqual([
      [0, 'Large bowl', false],
      [1, 'Grater', true],
    ]);

    const again = asDetail(await server().get(`/api/recipes/${id}`).set(as(alice)));
    expect(again).toEqual(detail);
  });

  it('reorders in place, keeping every id', async () => {
    const id = await freshRecipe(alice);
    const first = asDetail(await patch(alice, id, { ingredients: THREE }));
    const reversed = [...first.ingredients]
      .reverse()
      .map(({ id: lineId, name, amount, unit, note }) => ({
        id: lineId,
        name,
        amount,
        unit,
        note,
      }));
    const second = asDetail(await patch(alice, id, { ingredients: reversed }));
    expect(second.ingredients.map((i) => i.id)).toEqual(
      first.ingredients.map((i) => i.id).reverse(),
    );
    expect(second.ingredients.map((i) => i.position)).toEqual([0, 1, 2]);
  });

  it('deletes a row left out and inserts a row with no id', async () => {
    const id = await freshRecipe(alice);
    const first = asDetail(await patch(alice, id, { ingredients: THREE }));
    const [keep] = first.ingredients;
    if (keep === undefined) throw new Error('nothing stored');
    const second = asDetail(
      await patch(alice, id, {
        ingredients: [
          { id: keep.id, name: keep.name, amount: keep.amount, unit: keep.unit },
          { name: 'Sour cream', amount: 2, unit: 'tbsp' },
        ],
      }),
    );
    expect(second.ingredients).toHaveLength(2);
    expect(second.ingredients[0]?.id).toBe(keep.id);
    expect(second.ingredients[1]?.name).toBe('Sour cream');
    expect(await db.select().from(ingredients).where(eq(ingredients.recipeId, id))).toHaveLength(2);
  });

  it('leaves what the body does not mention alone, and bumps updatedAt either way', async () => {
    const id = await freshRecipe(alice);
    const withLists = asDetail(await patch(alice, id, { ingredients: THREE, equipment: TWO }));
    const metaOnly = asDetail(await patch(alice, id, { title: 'Aukstā zupa' }));
    expect(metaOnly.ingredients).toEqual(withLists.ingredients);
    expect(metaOnly.equipment).toEqual(withLists.equipment);
    expect(new Date(metaOnly.updatedAt).getTime()).toBeGreaterThan(
      new Date(withLists.updatedAt).getTime(),
    );

    const listOnly = asDetail(await patch(alice, id, { ingredients: [{ name: 'Only this' }] }));
    expect(listOnly.title).toBe('Aukstā zupa');
    expect(listOnly.equipment).toEqual(withLists.equipment);
    expect(listOnly.ingredients.map((i) => i.name)).toEqual(['Only this']);
  });

  it('writes nothing when one line is bad, and names the line', async () => {
    const id = await freshRecipe(alice);
    const res = await patch(alice, id, { ingredients: [...THREE, { name: '   ' }] });
    expect(res.status).toBe(400);
    expect(asError(res).fields).toHaveProperty('ingredients.3.name');
    expect(await db.select().from(ingredients).where(eq(ingredients.recipeId, id))).toHaveLength(0);
  });

  it.each([
    ['a unit with no amount', { name: 'Salt', unit: 'g' }],
    ['an amount of 0', { name: 'Salt', amount: 0, unit: 'g' }],
    ['an amount of -1', { name: 'Salt', amount: -1, unit: 'g' }],
    ['three decimals', { name: 'Salt', amount: 1.005, unit: 'g' }],
    ['an amount of 100000', { name: 'Salt', amount: 100000, unit: 'g' }],
    ['a note over 200 characters', { name: 'Salt', note: 'x'.repeat(201) }],
    ['an unknown unit', { name: 'Salt', amount: 1, unit: 'handful' }],
  ])('rejects %s', async (_label, line) => {
    const id = await freshRecipe(alice);
    expect((await patch(alice, id, { ingredients: [line] })).status).toBe(400);
  });

  it('caps the lists, and writes nothing past the cap', async () => {
    const id = await freshRecipe(alice);
    const many = Array.from({ length: MAX_INGREDIENTS + 1 }, (_, i) => ({
      name: `Item ${String(i)}`,
    }));
    expect((await patch(alice, id, { ingredients: many })).status).toBe(400);
    const tools = Array.from({ length: MAX_EQUIPMENT + 1 }, (_, i) => ({
      name: `Tool ${String(i)}`,
    }));
    expect((await patch(alice, id, { equipment: tools })).status).toBe(400);
    expect(await db.select().from(ingredients).where(eq(ingredients.recipeId, id))).toHaveLength(0);
    expect(await db.select().from(equipment).where(eq(equipment.recipeId, id))).toHaveLength(0);
  });

  it("refuses an id from someone else's recipe, and changes neither", async () => {
    const mine = await freshRecipe(alice);
    const theirs = await freshRecipe(bob);
    const bobs = asDetail(await patch(bob, theirs, { ingredients: THREE }));
    const stolen = bobs.ingredients[0];
    if (stolen === undefined) throw new Error('nothing stored');

    const res = await patch(alice, mine, { ingredients: [{ id: stolen.id, name: 'Mine now' }] });
    expect(res.status).toBe(400);
    expect(asError(res).fields).toHaveProperty('ingredients.0.id');
    const bobsAgain = asDetail(await server().get(`/api/recipes/${theirs}`).set(as(bob)));
    expect(bobsAgain.ingredients).toEqual(bobs.ingredients);
    expect(asDetail(await server().get(`/api/recipes/${mine}`).set(as(alice))).ingredients).toEqual(
      [],
    );

    const notMine = await patch(alice, theirs, { ingredients: THREE });
    const missing = await server().get(`/api/recipes/${NOBODY}`).set(as(alice));
    expect(notMine.status).toBe(404);
    expect(notMine.body).toEqual(missing.body);
  });

  it('refuses the same id twice', async () => {
    const id = await freshRecipe(alice);
    const first = asDetail(await patch(alice, id, { ingredients: THREE }));
    const line = first.ingredients[0];
    if (line === undefined) throw new Error('nothing stored');
    const res = await patch(alice, id, {
      ingredients: [
        { id: line.id, name: 'One' },
        { id: line.id, name: 'Two' },
      ],
    });
    expect(res.status).toBe(400);
    expect(asError(res).fields).toHaveProperty('ingredients.1.id');
  });
});
