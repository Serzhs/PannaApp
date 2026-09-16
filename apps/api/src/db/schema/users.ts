import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  boolean,
  customType,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { timestamps } from './columns.js';
import { authProvider, unitSystem } from './enums.js';

/** Case-insensitive text, so email uniqueness does not depend on how it was typed. */
const citext = customType<{ data: string }>({ dataType: () => 'citext' });

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: citext().notNull().unique(),
  displayName: varchar({ length: 80 }).notNull(),
  avatarImageKey: varchar({ length: 255 }),
  /**
   * Null means "follow the device", which is not the same as having picked the value
   * the device happens to report. Resolution is: this choice, then the device, then
   * English. Never collapse null into a language.
   */
  locale: varchar({ length: 5, enum: ['en', 'lv'] }),
  unitSystem: unitSystem(),
  ...timestamps,
});

export const identities = pgTable(
  'identities',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: authProvider().notNull(),
    /** The provider's own id for this person: the only stable key, since an email can change. */
    subject: varchar({ length: 255 }).notNull(),
    /** Null when the provider did not send one, which Apple often does not after the first time. */
    email: citext(),
    emailVerified: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('identities_provider_subject_key').on(t.provider, t.subject),
    index('identities_user_id_idx').on(t.userId),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 of 256 bits of randomness. A raw token never reaches the database. */
    tokenHash: varchar({ length: 64 }).notNull().unique(),
    /** The token this one replaced, so reuse can revoke a whole chain rather than one link. */
    replacedTokenId: uuid().references((): AnyPgColumn => refreshTokens.id, {
      onDelete: 'set null',
    }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('refresh_tokens_user_id_idx').on(t.userId),
    index('refresh_tokens_replaced_idx').on(t.replacedTokenId),
  ],
);
