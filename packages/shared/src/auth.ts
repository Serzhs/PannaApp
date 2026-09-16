import { z } from 'zod';

import { unitSystemSchema } from './units.js';

export const authProviderSchema = z.enum(['google', 'apple']);
export type AuthProvider = z.infer<typeof authProviderSchema>;

/** The languages the app ships. Adding one is a translation file and an entry here. */
export const localeSchema = z.enum(['en', 'lv']);
export type Locale = z.infer<typeof localeSchema>;

/**
 * What the app knows about the signed-in person. `locale` and `unitSystem` are null
 * until chosen, which means "follow the device" and is not the same as any value.
 */
export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  locale: localeSchema.nullable(),
  unitSystem: unitSystemSchema.nullable(),
});

/** Any subset, never nothing. Null on the two preferences restores "follow the device". */
export const updateMeBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    locale: localeSchema.nullable(),
    unitSystem: unitSystemSchema.nullable(),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' });

export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;

export const sessionSchema = z.object({
  user: sessionUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

/** Strict, so an unexpected field is a 400 rather than something quietly dropped. */
export const signInBodySchema = z
  .object({
    provider: authProviderSchema,
    idToken: z.string().min(1),
    nonce: z.string().min(1),
    displayName: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const refreshBodySchema = z.object({ refreshToken: z.string().min(1) }).strict();

/**
 * The development sign-in takes only an email, and the server matches it against a user
 * the seed already created. It cannot create one, so this is not a way to mint an
 * account - only a way to reach one that exists.
 */
export const devSignInBodySchema = z.object({ email: z.string().email() }).strict();

export type SignInBody = z.infer<typeof signInBodySchema>;
export type Session = z.infer<typeof sessionSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
