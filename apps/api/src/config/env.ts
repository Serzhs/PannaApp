import { z } from 'zod';

/**
 * The API refuses to start on a bad environment. A missing secret that surfaces three
 * screens into a request is far more expensive to diagnose than one that stops the
 * process with the variable's name in the message.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  // A short secret is a brute-forceable one.
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  // 0003 fills these in. Empty is fine until then.
  GOOGLE_CLIENT_ID_IOS: z.string().default(''),
  GOOGLE_CLIENT_ID_ANDROID: z.string().default(''),
  APPLE_CLIENT_ID: z.string().default(''),

  ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(30 * 24 * 60 * 60),

  /**
   * Gate two of three on the development sign-in. Gate one is that the module is only
   * registered when this is true, gate three is that the client's button is compiled
   * out of a release bundle. See the refinement below: production plus this is a
   * configuration the API refuses to start on.
   */
  ALLOW_DEV_SIGN_IN: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

/**
 * A production API with the development sign-in enabled does not start. Refusing to
 * boot is the only gate that cannot be forgotten at deploy time, which is why the
 * unsafe combination is an error here rather than a warning in a log nobody reads.
 */
const validatedEnvSchema = envSchema.refine(
  (env) => !(env.ALLOW_DEV_SIGN_IN && env.NODE_ENV === 'production'),
  {
    path: ['ALLOW_DEV_SIGN_IN'],
    message:
      'must not be true when NODE_ENV is production: it would expose a sign-in with no provider',
  },
);

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = validatedEnvSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  const lines = parsed.error.issues.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`);
  throw new Error(
    `Environment is not valid, so the API will not start:\n${lines.join('\n')}\n\n` +
      'Copy .env.example to .env and fill in the values above.',
  );
}
