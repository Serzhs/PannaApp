import { createHash, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ERROR_CODES, type AuthProvider } from '@panna/shared';
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

import { AppException } from '../../common/app-exception.js';
import type { Env } from '../../config/env.js';

export interface ProviderIdentity {
  readonly subject: string;
  readonly email: string | null;
  readonly emailVerified: boolean;
  readonly name: string | null;
}

export const PROVIDER_KEY_SETS = Symbol('PROVIDER_KEY_SETS');
export type ProviderKeySets = Record<AuthProvider, JWTVerifyGetKey>;

/** jose caches the fetched keys and refetches when a token names a key it has not seen. */
export function remoteKeySets(): ProviderKeySets {
  return {
    google: createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')),
    apple: createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys')),
  };
}

const ISSUERS: Record<AuthProvider, string[]> = {
  // Google documents both forms and issues either.
  google: ['https://accounts.google.com', 'accounts.google.com'],
  apple: ['https://appleid.apple.com'],
};

/**
 * The token is minted moments before it reaches us, so anything older is a token that
 * was kept for later. Well inside both providers' own expiry.
 */
const MAX_TOKEN_AGE = '10m';
const CLOCK_TOLERANCE = '1m';

/**
 * The client hands the provider the SHA-256 of its nonce and sends us the nonce itself.
 * The token therefore carries only the hash, so holding a token - from a log, say - is
 * not enough to present it: the raw value never appears in it.
 */
export function hashNonce(nonce: string): string {
  return createHash('sha256').update(nonce).digest('hex');
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Injectable()
export class ProviderTokenVerifier {
  private readonly logger = new Logger(ProviderTokenVerifier.name);
  private readonly audiences: Record<AuthProvider, string[]>;

  constructor(
    @Inject(PROVIDER_KEY_SETS) private readonly keySets: ProviderKeySets,
    config: ConfigService<Env, true>,
  ) {
    const nonEmpty = (ids: string[]) => ids.filter((id) => id.length > 0);
    this.audiences = {
      google: nonEmpty([
        config.get('GOOGLE_CLIENT_ID_IOS', { infer: true }),
        config.get('GOOGLE_CLIENT_ID_ANDROID', { infer: true }),
      ]),
      apple: nonEmpty([config.get('APPLE_CLIENT_ID', { infer: true })]),
    };
  }

  async verify(provider: AuthProvider, idToken: string, nonce: string): Promise<ProviderIdentity> {
    const audience = this.audiences[provider];
    // An empty audience list would make jose skip the audience check entirely.
    if (audience.length === 0) {
      return this.reject(provider, 'no client id is configured for this provider');
    }

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(idToken, this.keySets[provider], {
        issuer: ISSUERS[provider],
        audience,
        algorithms: ['RS256'],
        requiredClaims: ['sub', 'iat', 'exp', 'nonce'],
        maxTokenAge: MAX_TOKEN_AGE,
        clockTolerance: CLOCK_TOLERANCE,
      }));
    } catch (cause) {
      return this.reject(provider, cause instanceof Error ? cause.message : 'verification failed');
    }

    if (typeof payload.nonce !== 'string' || !sameString(payload.nonce, hashNonce(nonce))) {
      return this.reject(provider, 'nonce does not match this attempt');
    }

    return {
      subject: payload.sub ?? '',
      email: typeof payload.email === 'string' ? payload.email : null,
      // Apple sends this as the string "true"; Google as a boolean.
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: typeof payload.name === 'string' ? payload.name : null,
    };
  }

  private reject(provider: AuthProvider, reason: string): never {
    this.logger.warn({ provider, reason, event: 'provider_token_rejected' }, 'Sign-in rejected');
    throw new AppException(
      401,
      ERROR_CODES.AUTH_PROVIDER_TOKEN_INVALID,
      'Provider token is not valid',
    );
  }
}
