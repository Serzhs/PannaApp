import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import {
  API_PREFIX,
  ERROR_CODES,
  errorBodySchema,
  recipeDetailSchema,
  recipeSchema,
  sessionSchema,
  uploadedImageSchema,
} from '@panna/shared';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ErrorFilter } from '../../common/error.filter.js';
import { validateEnv } from '../../config/env.js';
import { DatabaseModule } from '../../db/database.module.js';
import { users } from '../../db/schema/index.js';
import { db } from '../../test/db.js';
import { AuthModule } from '../auth/auth.module.js';
import { RecipesModule } from '../recipes/recipes.module.js';

import { ImagesModule } from './images.module.js';

const ALICE = { email: 'alice@example.com', displayName: 'Alice' };
const BOB = { email: 'bob@example.com', displayName: 'Bob' };

/** A wide PNG carrying an orientation tag and a made-up GPS position, like a phone photo. */
async function phonePhoto(): Promise<Buffer> {
  return sharp({ create: { width: 3000, height: 1000, channels: 3, background: '#a33' } })
    .png()
    .withMetadata({ orientation: 6, exif: { IFD0: { ImageDescription: 'kitchen' } } })
    .toBuffer();
}

describe('images, end to end', () => {
  let app: NestExpressApplication;
  let alice: string;
  let bob: string;
  const dir = String(process.env.IMAGE_DIR);

  beforeAll(async () => {
    const env = validateEnv({ ...process.env, ALLOW_DEV_SIGN_IN: 'true' });
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
        DatabaseModule,
        AuthModule.register(env),
        ImagesModule,
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
  const asError = (res: request.Response) => errorBodySchema.parse(res.body);
  const asDetail = (res: request.Response) => recipeDetailSchema.parse(res.body);

  async function tokenFor(email: string): Promise<string> {
    const res = await server().post('/api/auth/dev-session').send({ email });
    return sessionSchema.parse(res.body).accessToken;
  }
  async function upload(token: string, bytes: Buffer, name = 'photo.png'): Promise<string> {
    const res = await server().post('/api/images').set(as(token)).attach('file', bytes, name);
    expect(res.status).toBe(201);
    return uploadedImageSchema.parse(res.body).key;
  }
  const stored = async () => (await readdir(dir)).filter((f) => f.endsWith('.jpg'));

  beforeEach(async () => {
    await db.insert(users).values([ALICE, BOB]);
    alice = await tokenFor(ALICE.email);
    bob = await tokenFor(BOB.email);
  });

  /** The criteria: upright, no wider than 1600, no EXIF, served immutable. */
  it('stores an upload shrunk, upright and stripped, and serves it for good', async () => {
    const key = await upload(alice, await phonePhoto());
    expect(key).toMatch(/^[a-f0-9]{32}$/);
    const meta = await sharp(await readFile(join(dir, `${key}.jpg`))).metadata();
    expect(meta.format).toBe('jpeg');
    // Orientation 6 is a quarter turn, so the wide original comes out tall.
    expect(meta.width).toBeLessThanOrEqual(1600);
    expect(meta.height).toBeLessThanOrEqual(1600);
    expect(meta.height).toBeGreaterThan(meta.width);
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();

    const res = await server().get(`/api/images/${key}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/jpeg');
    expect(res.headers['cache-control']).toContain('immutable');
  });

  it('refuses bytes that are not an image, and a key that names nothing', async () => {
    const before = (await stored()).length;
    const res = await server()
      .post('/api/images')
      .set(as(alice))
      .attach('file', Buffer.from('hello'), 'notes.txt');
    expect(res.status).toBe(400);
    expect(asError(res).code).toBe(ERROR_CODES.IMAGE_UNSUPPORTED);
    expect((await stored()).length).toBe(before);

    for (const key of ['nope', 'a'.repeat(32), '../../etc/passwd']) {
      const missing = await server().get(`/api/images/${encodeURIComponent(key)}`);
      expect(missing.status).toBe(404);
      expect(asError(missing).code).toBe(ERROR_CODES.IMAGE_NOT_FOUND);
    }
  });

  it('needs a session to upload', async () => {
    const res = await server()
      .post('/api/images')
      .attach('file', await phonePhoto(), 'p.png');
    expect(res.status).toBe(401);
  });

  it('attaches a cover and step photos, drops the files it replaces, and all of them on delete', async () => {
    const cover = await upload(alice, await phonePhoto());
    const created = await server()
      .post('/api/recipes')
      .set(as(alice))
      .send({ title: 'Soup', servings: 2, coverImageKey: cover });
    expect(created.status).toBe(201);
    const id = recipeSchema.parse(created.body).id;
    expect(recipeDetailSchema.parse(created.body).coverImageKey).toBe(cover);

    const unknown = await server()
      .patch(`/api/recipes/${id}`)
      .set(as(alice))
      .send({ coverImageKey: 'b'.repeat(32) });
    expect(unknown.status).toBe(400);
    expect(asError(unknown).fields).toEqual({ coverImageKey: 'UNKNOWN_IMAGE' });

    const stepPhoto = await upload(alice, await phonePhoto());
    const withStep = asDetail(
      await server()
        .patch(`/api/recipes/${id}`)
        .set(as(alice))
        .send({ steps: [{ body: 'Chop', imageKey: stepPhoto }] }),
    );
    expect(withStep.steps[0]?.imageKey).toBe(stepPhoto);

    const newCover = await upload(alice, await phonePhoto());
    const replaced = asDetail(
      await server().patch(`/api/recipes/${id}`).set(as(alice)).send({ coverImageKey: newCover }),
    );
    expect(replaced.coverImageKey).toBe(newCover);
    expect(await stored()).not.toContain(`${cover}.jpg`);
    expect(await stored()).toContain(`${newCover}.jpg`);

    // Bob cannot reach in: his PATCH is a 404 and Alice's files stay.
    const bobs = await server()
      .patch(`/api/recipes/${id}`)
      .set(as(bob))
      .send({ coverImageKey: null });
    expect(bobs.status).toBe(404);
    expect(await stored()).toContain(`${newCover}.jpg`);

    expect((await server().delete(`/api/recipes/${id}`).set(as(alice))).status).toBe(204);
    expect(await stored()).not.toContain(`${newCover}.jpg`);
    expect(await stored()).not.toContain(`${stepPhoto}.jpg`);
  });
});
