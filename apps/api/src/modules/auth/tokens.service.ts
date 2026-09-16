import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import type { Env } from '../../config/env.js';
import { DatabaseService } from '../../db/database.service.js';
import { refreshTokens } from '../../db/schema/index.js';

/** The whole payload. A JWT is signed, not encrypted, so nothing private goes in it. */
export interface AccessTokenClaims {
  readonly sub: string;
}

export interface IssuedTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
}

/** 256 bits, so the token is already high entropy and a slow hash buys nothing. */
const REFRESH_TOKEN_BYTES = 32;

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class TokensService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  signAccessToken(userId: string): string {
    const claims: AccessTokenClaims = { sub: userId };
    return this.jwt.sign(claims, {
      expiresIn: this.config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
    });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    return this.jwt.verify<AccessTokenClaims>(token);
  }

  /**
   * `replaces` records the token this one supersedes, which is what makes a chain
   * identifiable when one of its links is presented twice.
   */
  async issueRefreshToken(userId: string, replaces?: string): Promise<string> {
    const raw = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(
      Date.now() + this.config.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true }) * 1000,
    );

    await this.database.db.insert(refreshTokens).values({
      userId,
      tokenHash: hashRefreshToken(raw),
      expiresAt,
      ...(replaces === undefined ? {} : { replacedTokenId: replaces }),
    });

    return raw;
  }

  async issue(userId: string): Promise<IssuedTokens> {
    return {
      accessToken: this.signAccessToken(userId),
      refreshToken: await this.issueRefreshToken(userId),
    };
  }

  async findRefreshToken(raw: string) {
    const [row] = await this.database.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashRefreshToken(raw)))
      .limit(1);
    return row;
  }

  /**
   * Revokes every token in the chain the given one belongs to. A chain is a linked
   * list - each token names the one it replaced - so the chain is that token's
   * connected component, walked in both directions.
   *
   * Revoking only the token presented would leave a thief's freshly issued token
   * working while the victim's rotation failed, which is the wrong way round.
   */
  async revokeChain(tokenId: string, userId: string): Promise<void> {
    const rows = await this.database.db
      .select({ id: refreshTokens.id, replacedTokenId: refreshTokens.replacedTokenId })
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, userId));

    const neighbours = new Map<string, string[]>();
    const link = (a: string, b: string): void => {
      neighbours.set(a, [...(neighbours.get(a) ?? []), b]);
      neighbours.set(b, [...(neighbours.get(b) ?? []), a]);
    };
    for (const row of rows) {
      if (row.replacedTokenId !== null) link(row.id, row.replacedTokenId);
    }

    const chain = new Set<string>();
    const queue = [tokenId];
    while (queue.length > 0) {
      const id = queue.pop();
      if (id === undefined || chain.has(id)) continue;
      chain.add(id);
      queue.push(...(neighbours.get(id) ?? []));
    }

    await this.database.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), inArray(refreshTokens.id, [...chain])));
  }

  async revoke(tokenId: string): Promise<void> {
    await this.database.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenId));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.database.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }
}
