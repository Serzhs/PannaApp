import { timestamp } from 'drizzle-orm/pg-core';

/** Every table carries these. A uniform rule is cheaper than an exception nobody remembers. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};
