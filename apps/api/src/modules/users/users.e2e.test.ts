import { readdir } from 'node:fs/promises';

import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import {
  API_PREFIX,
  ERROR_CODES,
  errorBodySchema,
  sessionSchema,
  sessionUserSchema,
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
import { ImagesModule } from '../images/images.module.js';

import { UsersModule } from './users.module.js';

const SEEDED = { email: 'liga@example.com', displayName: 'Līga' };

const asUser = (res: request.Response) => sessionUserSchema.parse(res.body);
const asError = (res: request.Response) => errorBodySchema.parse(res.body);

describe('me, end to end', () => {
  let app: NestExpressApplication;
  let token: string;

  beforeAll(async () => {
    const env = validateEnv({ ...process.env, ALLOW_DEV_SIGN_IN: 'true' });
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
        DatabaseModule,
        AuthModule.register(env),
        ImagesModule,
        UsersModule,
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
  const as = () => ({ Authorization: `Bearer ${token}` });

  beforeEach(async () => {
    await db.insert(users).values(SEEDED);
    const res = await server().post('/api/auth/dev-session').send({ email: SEEDED.email });
    token = sessionSchema.parse(res.body).accessToken;
  });

  it('starts with both preferences null, meaning follow the device, and no avatar', async () => {
    const me = asUser(await server().get('/api/me').set(as()));
    expect(me.locale).toBeNull();
    expect(me.unitSystem).toBeNull();
    expect(me.avatarImageKey).toBeNull();
  });

  async function photo(): Promise<string> {
    const bytes = await sharp({
      create: { width: 40, height: 40, channels: 3, background: '#3a5' },
    })
      .png()
      .toBuffer();
    const res = await server().post('/api/images').set(as()).attach('file', bytes, 'me.png');
    return uploadedImageSchema.parse(res.body).key;
  }

  /** 0018: set, carried by sign-in, replaced with the old file gone, cleared with the last gone. */
  it('stores an avatar, replaces it, clears it, and removes the files it no longer needs', async () => {
    const dir = String(process.env.IMAGE_DIR);
    const first = await photo();
    const set = await server().patch('/api/me').set(as()).send({ avatarImageKey: first });
    expect(set.status).toBe(200);
    expect(asUser(set).avatarImageKey).toBe(first);
    const signIn = await server().post('/api/auth/dev-session').send({ email: SEEDED.email });
    expect(sessionSchema.parse(signIn.body).user.avatarImageKey).toBe(first);

    const second = await photo();
    const replaced = asUser(
      await server().patch('/api/me').set(as()).send({ avatarImageKey: second }),
    );
    expect(replaced.avatarImageKey).toBe(second);
    let files = await readdir(dir);
    expect(files).toContain(`${second}.jpg`);
    expect(files).not.toContain(`${first}.jpg`);

    const cleared = asUser(
      await server().patch('/api/me').set(as()).send({ avatarImageKey: null }),
    );
    expect(cleared.avatarImageKey).toBeNull();
    files = await readdir(dir);
    expect(files).not.toContain(`${second}.jpg`);
  });

  it('refuses an avatar key with no file behind it, by field', async () => {
    const res = await server()
      .patch('/api/me')
      .set(as())
      .send({ avatarImageKey: 'f'.repeat(32) });
    expect(res.status).toBe(400);
    expect(asError(res).code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(asError(res).fields).toEqual({ avatarImageKey: 'UNKNOWN_IMAGE' });
    expect(asUser(await server().get('/api/me').set(as())).avatarImageKey).toBeNull();
  });

  it('stores a locale and a unit system, and GET /api/me reflects them', async () => {
    const patched = await server()
      .patch('/api/me')
      .set(as())
      .send({ locale: 'lv', unitSystem: 'imperial' });
    expect(patched.status).toBe(200);
    expect(asUser(patched)).toMatchObject({ locale: 'lv', unitSystem: 'imperial' });

    const me = asUser(await server().get('/api/me').set(as()));
    expect(me).toMatchObject({ locale: 'lv', unitSystem: 'imperial' });
  });

  it('restores follow-the-device with null', async () => {
    await server().patch('/api/me').set(as()).send({ locale: 'lv' });
    const cleared = asUser(await server().patch('/api/me').set(as()).send({ locale: null }));
    expect(cleared.locale).toBeNull();
  });

  it('refuses a locale the app does not ship', async () => {
    const res = await server().patch('/api/me').set(as()).send({ locale: 'de' });
    expect(res.status).toBe(400);
    expect(asError(res).code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(asError(res).fields).toHaveProperty('locale');
  });

  it('refuses a unit system outside the enum, an empty body, and an unknown field', async () => {
    expect((await server().patch('/api/me').set(as()).send({ unitSystem: 'cups' })).status).toBe(
      400,
    );
    expect((await server().patch('/api/me').set(as()).send({})).status).toBe(400);
    expect((await server().patch('/api/me').set(as()).send({ email: 'x@y.z' })).status).toBe(400);
  });

  it('changes the display name', async () => {
    const renamed = asUser(
      await server().patch('/api/me').set(as()).send({ displayName: '  Līga B. ' }),
    );
    expect(renamed.displayName).toBe('Līga B.');
  });

  it('needs a token', async () => {
    expect((await server().patch('/api/me').send({ locale: 'en' })).status).toBe(401);
  });
});
