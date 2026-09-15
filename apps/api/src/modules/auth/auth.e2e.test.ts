import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import {
  API_PREFIX,
  ERROR_CODES,
  errorBodySchema,
  sessionSchema,
  sessionUserSchema,
  tokenPairSchema,
} from '@panna/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ErrorFilter } from '../../common/error.filter.js';
import { validateEnv } from '../../config/env.js';
import { DatabaseModule } from '../../db/database.module.js';
import { users } from '../../db/schema/index.js';
import { db } from '../../test/db.js';

import { AuthModule } from './auth.module.js';

const SEEDED = { email: 'dev@example.com', displayName: 'Dev' };

/**
 * Every body is parsed with the schema the contract promises, so these assertions also
 * prove the endpoint answers the shape the mobile client will parse it with.
 */
const asSession = (res: request.Response) => sessionSchema.parse(res.body);
const asTokens = (res: request.Response) => tokenPairSchema.parse(res.body);
const asError = (res: request.Response) => errorBodySchema.parse(res.body);

async function buildApp(allowDevSignIn: boolean): Promise<NestExpressApplication> {
  const env = validateEnv({ ...process.env, ALLOW_DEV_SIGN_IN: allowDevSignIn ? 'true' : 'false' });

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
      DatabaseModule,
      AuthModule.register(env),
    ],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new ErrorFilter());
  await app.init();
  return app;
}

describe('auth, end to end', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await buildApp(true);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.insert(users).values(SEEDED);
  });

  const server = () => request(app.getHttpServer());

  it('signs in a seeded user and the session works against /api/me', async () => {
    const signIn = await server().post('/api/auth/dev-session').send({ email: SEEDED.email });
    expect(signIn.status).toBe(200);
    const session = asSession(signIn);
    expect(session.user).toMatchObject({
      email: SEEDED.email,
      displayName: SEEDED.displayName,
    });

    const me = await server().get('/api/me').set('Authorization', `Bearer ${session.accessToken}`);
    expect(me.status).toBe(200);
    expect(sessionUserSchema.parse(me.body)).toMatchObject({ email: SEEDED.email });
  });

  it('refuses an email no user holds, and creates nothing', async () => {
    const res = await server().post('/api/auth/dev-session').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(404);
    expect(asError(res).code).toBe(ERROR_CODES.AUTH_DEV_USER_NOT_FOUND);

    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
  });

  it('rejects a body carrying a field the schema does not define', async () => {
    const res = await server()
      .post('/api/auth/dev-session')
      .send({ email: SEEDED.email, role: 'admin' });
    expect(res.status).toBe(400);
    expect(asError(res).code).toBe(ERROR_CODES.VALIDATION_FAILED);
  });

  it('refuses /api/me without a token and with a nonsense one', async () => {
    expect((await server().get('/api/me')).status).toBe(401);
    expect((await server().get('/api/me').set('Authorization', 'Bearer nope')).status).toBe(401);
  });

  it('rotates a refresh token, and the old one stops working', async () => {
    const first = asSession(
      await server().post('/api/auth/dev-session').send({ email: SEEDED.email }),
    ).refreshToken;

    const rotated = await server().post('/api/auth/refresh').send({ refreshToken: first });
    expect(rotated.status).toBe(200);
    expect(asTokens(rotated).refreshToken).not.toBe(first);

    const reused = await server().post('/api/auth/refresh').send({ refreshToken: first });
    expect(reused.status).toBe(401);
    expect(asError(reused).code).toBe(ERROR_CODES.AUTH_TOKEN_REVOKED);
  });

  /** Reuse is theft: the token the thief's first use produced must die too. */
  it('revokes the whole chain when a token is reused, not just the one presented', async () => {
    const first = asSession(
      await server().post('/api/auth/dev-session').send({ email: SEEDED.email }),
    ).refreshToken;

    const second = asTokens(
      await server().post('/api/auth/refresh').send({ refreshToken: first }),
    ).refreshToken;
    await server().post('/api/auth/refresh').send({ refreshToken: first });

    const afterReuse = await server().post('/api/auth/refresh').send({ refreshToken: second });
    expect(afterReuse.status).toBe(401);
    expect(asError(afterReuse).code).toBe(ERROR_CODES.AUTH_TOKEN_REVOKED);
  });

  it('never returns a token hash or a provider subject', async () => {
    const signIn = await server().post('/api/auth/dev-session').send({ email: SEEDED.email });
    const body = JSON.stringify(signIn.body as unknown);
    expect(body).not.toMatch(/tokenHash/i);
    expect(body).not.toMatch(/subject/i);
  });
});

describe('the development sign-in when it is switched off', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await buildApp(false);
  });

  afterAll(async () => {
    await app.close();
  });

  /** Gate one: not a guarded handler, but no handler at all. */
  it('has no route behind it at all', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/dev-session')
      .send({ email: SEEDED.email });
    expect(res.status).toBe(404);
  });

  it('still serves the real auth routes', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'nope' });
    expect(res.status).toBe(401);
  });
});
