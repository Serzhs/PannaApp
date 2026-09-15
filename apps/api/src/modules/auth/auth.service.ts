import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES, type Session, type SessionUser } from '@panna/shared';
import { eq } from 'drizzle-orm';

import { AppException } from '../../common/app-exception.js';
import { DatabaseService } from '../../db/database.service.js';
import { users } from '../../db/schema/index.js';

import { TokensService } from './tokens.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly tokens: TokensService,
  ) {}

  async findUserById(id: string): Promise<SessionUser | undefined> {
    const [row] = await this.database.db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row;
  }

  async findUserByEmail(email: string): Promise<SessionUser | undefined> {
    const [row] = await this.database.db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row;
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
