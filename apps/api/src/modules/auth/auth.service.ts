import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES, type AuthProvider, type Session, type SessionUser } from '@panna/shared';
import { and, eq } from 'drizzle-orm';

import { AppException } from '../../common/app-exception.js';
import { DatabaseService } from '../../db/database.service.js';
import { identities, users } from '../../db/schema/index.js';

import type { ProviderIdentity } from './provider-token.verifier.js';
import { TokensService } from './tokens.service.js';

const DISPLAY_NAME_MAX = 80;

/** The columns a session user is made of, in one place so no query can forget one. */
export const SESSION_USER_COLUMNS = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  locale: users.locale,
  unitSystem: users.unitSystem,
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly tokens: TokensService,
  ) {}

  async findUserById(id: string): Promise<SessionUser | undefined> {
    const [row] = await this.database.db
      .select(SESSION_USER_COLUMNS)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row;
  }

  async findUserByEmail(email: string): Promise<SessionUser | undefined> {
    const [row] = await this.database.db
      .select(SESSION_USER_COLUMNS)
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row;
  }

  /**
   * Matches on (provider, subject) first, the only stable key. Otherwise the identity
   * joins the user holding its email, which is safe only because an unverified email
   * never gets this far: linking on one would hand the account to anyone a provider
   * lets claim that address.
   */
  async signInWithProvider(
    provider: AuthProvider,
    identity: ProviderIdentity,
    displayName: string | undefined,
  ): Promise<Session> {
    const user = await this.database.db.transaction(async (tx) => {
      const [linked] = await tx
        .select(SESSION_USER_COLUMNS)
        .from(identities)
        .innerJoin(users, eq(identities.userId, users.id))
        .where(and(eq(identities.provider, provider), eq(identities.subject, identity.subject)))
        .limit(1);
      if (linked !== undefined) return linked;

      // Every account is keyed by a unique email, so one nobody vouches for cannot
      // start an account either. Google and Apple verify addresses, so this is rare.
      if (identity.email === null || !identity.emailVerified) {
        this.logger.warn({ provider, event: 'unverified_email' }, 'Sign-in without verified email');
        throw new AppException(
          401,
          ERROR_CODES.AUTH_PROVIDER_TOKEN_INVALID,
          'Provider did not vouch for an email',
        );
      }

      let [owner] = await tx
        .select(SESSION_USER_COLUMNS)
        .from(users)
        .where(eq(users.email, identity.email))
        .limit(1);

      // A name is taken only when the account is created. Apple sends one on the very
      // first authorisation and never again, so a later sign-in must not blank it.
      owner ??= (
        await tx
          .insert(users)
          .values({
            email: identity.email,
            displayName: (displayName ?? identity.name ?? '').slice(0, DISPLAY_NAME_MAX),
          })
          .returning(SESSION_USER_COLUMNS)
      )[0];
      if (owner === undefined) throw new Error('Insert returned no user');

      await tx.insert(identities).values({
        userId: owner.id,
        provider,
        subject: identity.subject,
        email: identity.email,
        emailVerified: identity.emailVerified,
      });
      return owner;
    });

    return this.startSession(user);
  }

  async startSession(user: SessionUser): Promise<Session> {
    const { accessToken, refreshToken } = await this.tokens.issue(user.id);
    return { user, accessToken, refreshToken };
  }

  /**
   * Rotation. Every use issues a new token and revokes the one presented, so a token
   * works exactly once.
   */
  async refresh(raw: string): Promise<{ accessToken: string; refreshToken: string }> {
    const existing = await this.tokens.findRefreshToken(raw);
    if (existing === undefined) {
      throw new AppException(401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Refresh token is not known');
    }

    if (existing.revokedAt !== null) {
      // Reuse is theft: the token already did its one job, so someone has a copy.
      // Revoking the whole chain signs both parties out rather than leaving the
      // thief's fresh token working while the victim's rotation fails.
      await this.tokens.revokeChain(existing.id, existing.userId);
      this.logger.warn(
        { userId: existing.userId, tokenId: existing.id, event: 'refresh_token_reuse' },
        'Refresh token reused, revoking the chain',
      );
      throw new AppException(401, ERROR_CODES.AUTH_TOKEN_REVOKED, 'Refresh token was already used');
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new AppException(401, ERROR_CODES.AUTH_TOKEN_EXPIRED, 'Refresh token has expired');
    }

    await this.tokens.revoke(existing.id);
    const refreshToken = await this.tokens.issueRefreshToken(existing.userId, existing.id);
    return { accessToken: this.tokens.signAccessToken(existing.userId), refreshToken };
  }

  async logout(raw: string): Promise<void> {
    const existing = await this.tokens.findRefreshToken(raw);
    // A logout with an unknown token is already in the state the caller wanted, and
    // saying so would confirm which tokens exist.
    if (existing === undefined) return;
    await this.tokens.revokeChain(existing.id, existing.userId);
  }
}
