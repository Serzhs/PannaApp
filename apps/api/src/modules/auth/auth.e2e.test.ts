import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('refuses /api/me with an expired token, and says that it expired', async () => {
    const [user] = await db.select().from(users);
    if (user === undefined) throw new Error('no user');
    const expired = app
      .get(JwtService, { strict: false })
      .sign({ sub: user.id }, { expiresIn: -10 });
    const res = await server().get('/api/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(asError(res).code).toBe(ERROR_CODES.AUTH_TOKEN_EXPIRED);
  });

  /** A JWT is signed, not encrypted: anyone holding it can read it, so it carries nothing private. */
  it('puts nothing in the access token beyond what identifies the session', async () => {
    const session = asSession(
      await server().post('/api/auth/dev-session').send({ email: SEEDED.email }),
    );
    const payload = app
      .get(JwtService, { strict: false })
      .decode<Record<string, unknown>>(session.accessToken);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(payload.sub).toBe(session.user.id);
    expect(JSON.stringify(payload)).not.toContain(SEEDED.email);
    expect(JSON.stringify(payload)).not.toContain(SEEDED.displayName);
  });

  it('rejects an unknown field on refresh and on logout, not only on sign-in', async () => {
    const session = asSession(
      await server().post('/api/auth/dev-session').send({ email: SEEDED.email }),
    );
    const refresh = await server()
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken, role: 'admin' });
    expect(refresh.status).toBe(400);
    expect(asError(refresh).code).toBe(ERROR_CODES.VALIDATION_FAILED);

    const logout = await server()
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken, everywhere: true });
    expect(logout.status).toBe(400);
    expect(asError(logout).code).toBe(ERROR_CODES.VALIDATION_FAILED);
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

  /** Reuse is the only evidence of a stolen token, so it has to reach the log with the user named. */
  it('logs a reuse with the user and the event named', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const session = asSession(
      await server().post('/api/auth/dev-session').send({ email: SEEDED.email }),
    );
    await server().post('/api/auth/refresh').send({ refreshToken: session.refreshToken });
    await server().post('/api/auth/refresh').send({ refreshToken: session.refreshToken });

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: session.user.id, event: 'refresh_token_reuse' }),
      expect.stringContaining('reused'),
    );
    warn.mockRestore();
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
