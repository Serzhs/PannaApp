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
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  const lines = parsed.error.issues.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`);
  throw new Error(
    `Environment is not valid, so the API will not start:\n${lines.join('\n')}\n\n` +
      'Copy .env.example to .env and fill in the values above.',
  );
}
