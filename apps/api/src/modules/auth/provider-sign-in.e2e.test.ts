import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { API_PREFIX, ERROR_CODES, errorBodySchema, sessionSchema } from '@panna/shared';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ErrorFilter } from '../../common/error.filter.js';
import { validateEnv } from '../../config/env.js';
import { DatabaseModule } from '../../db/database.module.js';
import { identities, users } from '../../db/schema/index.js';
import { db } from '../../test/db.js';

import { AuthModule } from './auth.module.js';
import { hashNonce, PROVIDER_KEY_SETS, type ProviderKeySets } from './provider-token.verifier.js';

const GOOGLE_AUDIENCE = 'test-google-ios-client';
const APPLE_AUDIENCE = 'app.panna.mobile';
const NONCE = 'the-nonce-for-this-attempt';

interface TokenOptions {
  readonly provider?: 'google' | 'apple';
  readonly subject?: string;
  readonly email?: string;
  readonly emailVerified?: boolean | 'true' | 'false';
  readonly name?: string;
  readonly audience?: string;
  readonly nonce?: string;
  readonly issuedAt?: number;
  readonly expiresAt?: number;
  readonly key?: CryptoKey;
}

describe('sign in with a provider, end to end', () => {
  let app: NestExpressApplication;
  let providerKey: CryptoKey;
  let strangerKey: CryptoKey;

  /**
   * The real key sets are fetched from Google and Apple. These are keys we generate, so
   * every check runs against a genuine signature rather than a stubbed verifier.
   */
  beforeAll(async () => {
    const provider = await generateKeyPair('RS256');
    providerKey = provider.privateKey;
    strangerKey = (await generateKeyPair('RS256')).privateKey;
    const jwk = { ...(await exportJWK(provider.publicKey)), kid: 'test', alg: 'RS256' };
    const keySet = createLocalJWKSet({ keys: [jwk] });
    const keySets: ProviderKeySets = { google: keySet, apple: keySet };

    const env = validateEnv({
      ...process.env,
      GOOGLE_CLIENT_ID_IOS: GOOGLE_AUDIENCE,
      APPLE_CLIENT_ID: APPLE_AUDIENCE,
    });
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
        DatabaseModule,
        AuthModule.register(env),
      ],
    })
      .overrideProvider(PROVIDER_KEY_SETS)
      .useValue(keySets)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalFilters(new ErrorFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function token(options: TokenOptions = {}): Promise<string> {
    const provider = options.provider ?? 'google';
    const now = Math.floor(Date.now() / 1000);
    const claims: Record<string, unknown> = {
      nonce: hashNonce(options.nonce ?? NONCE),
      email: options.email ?? 'cook@example.com',
      email_verified: options.emailVerified ?? true,
    };
    if (options.name !== undefined) claims.name = options.name;

    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer(
        provider === 'google' ? 'https://accounts.google.com' : 'https://appleid.apple.com',
      )
      .setAudience(options.audience ?? (provider === 'google' ? GOOGLE_AUDIENCE : APPLE_AUDIENCE))
      .setSubject(options.subject ?? `${provider}-subject-1`)
      .setIssuedAt(options.issuedAt ?? now)
      .setExpirationTime(options.expiresAt ?? now + 600)
      .sign(options.key ?? providerKey);
  }

  const signIn = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/auth/session')
      .send({ provider: 'google', nonce: NONCE, ...body });

  async function expectRejected(res: request.Response): Promise<void> {
    expect(res.status).toBe(401);
    expect(errorBodySchema.parse(res.body).code).toBe(ERROR_CODES.AUTH_PROVIDER_TOKEN_INVALID);
    expect(await db.select().from(users)).toHaveLength(0);
  }

  it('creates an account from a valid token, and the session works', async () => {
    const res = await signIn({ idToken: await token({ name: 'Anna Cook' }) });
    expect(res.status).toBe(200);
    const session = sessionSchema.parse(res.body);
    expect(session.user).toMatchObject({ email: 'cook@example.com', displayName: 'Anna Cook' });

    const me = await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(me.status).toBe(200);
  });

  it('signing in twice with the same account makes one user and one identity', async () => {
    await signIn({ idToken: await token() });
    await signIn({ idToken: await token() });
    expect(await db.select().from(users)).toHaveLength(1);
    expect(await db.select().from(identities)).toHaveLength(1);
  });

  it('joins Google and Apple with the same verified email into one user', async () => {
    await signIn({ idToken: await token() });
    const apple = await signIn({ provider: 'apple', idToken: await token({ provider: 'apple' }) });
    expect(apple.status).toBe(200);
    expect(await db.select().from(users)).toHaveLength(1);
    expect(await db.select().from(identities)).toHaveLength(2);
  });

  it("accepts Apple's email_verified sent as a string", async () => {
    const res = await signIn({
      provider: 'apple',
      idToken: await token({ provider: 'apple', emailVerified: 'true' }),
    });
    expect(res.status).toBe(200);
  });

  it('refuses an unverified email rather than joining or creating an account', async () => {
    await expectRejected(await signIn({ idToken: await token({ emailVerified: false }) }));
  });

  it('refuses an unverified email even when a user already holds that address', async () => {
    await db.insert(users).values({ email: 'cook@example.com', displayName: 'Owner' });
    const res = await signIn({ idToken: await token({ emailVerified: 'false' }) });
    expect(res.status).toBe(401);
    expect(await db.select().from(identities)).toHaveLength(0);
  });

  it("stores Apple's name on first sign-in and keeps it when a later one omits it", async () => {
    const apple = { provider: 'apple' as const };
    await signIn({ ...apple, idToken: await token(apple), displayName: 'Anna' });
    const later = await signIn({ ...apple, idToken: await token(apple) });
    expect(sessionSchema.parse(later.body).user.displayName).toBe('Anna');
  });

  it('ignores a display name sent for an account that already exists', async () => {
    await signIn({ idToken: await token(), displayName: 'First' });
    const later = await signIn({ idToken: await token(), displayName: 'Changed' });
    expect(sessionSchema.parse(later.body).user.displayName).toBe('First');
  });

  it('leaves the name blank when nobody supplied one', async () => {
    const res = await signIn({ provider: 'apple', idToken: await token({ provider: 'apple' }) });
    expect(sessionSchema.parse(res.body).user.displayName).toBe('');
  });

  it('rejects a genuine signature with the wrong audience', async () => {
    await expectRejected(await signIn({ idToken: await token({ audience: 'another-app' }) }));
  });

  it('rejects an expired token', async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    await expectRejected(
      await signIn({ idToken: await token({ issuedAt: past - 600, expiresAt: past }) }),
    );
  });

  it('rejects a token issued too long ago, even if it has not expired', async () => {
    const now = Math.floor(Date.now() / 1000);
    await expectRejected(
      await signIn({ idToken: await token({ issuedAt: now - 3600, expiresAt: now + 3600 }) }),
    );
  });

  it('rejects a token whose nonce belongs to a different attempt', async () => {
    await expectRejected(await signIn({ idToken: await token({ nonce: 'another-attempt' }) }));
  });

  it('rejects a token presented with the hash rather than the nonce itself', async () => {
    await expectRejected(await signIn({ idToken: await token(), nonce: hashNonce(NONCE) }));
  });

  it('rejects a provider access token where an ID token is required', async () => {
    await expectRejected(await signIn({ idToken: 'ya29.a0AfH6SMBx-an-opaque-access-token' }));
  });

  it('rejects a token signed by a key that is not the provider’s', async () => {
    await expectRejected(await signIn({ idToken: await token({ key: strangerKey }) }));
  });

  it('rejects a Google token presented as Apple', async () => {
    await expectRejected(await signIn({ provider: 'apple', idToken: await token() }));
  });

  it('rejects a body carrying a field the schema does not define', async () => {
    const res = await signIn({ idToken: await token(), userId: 'someone-else' });
    expect(res.status).toBe(400);
  });

  it('never returns a provider token or subject', async () => {
    const idToken = await token();
    const res = await signIn({ idToken });
    const body = JSON.stringify(res.body as unknown);
    expect(body).not.toContain(idToken);
    expect(body).not.toMatch(/subject/i);
  });
});
