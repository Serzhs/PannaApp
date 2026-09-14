import { describe, expect, it } from 'vitest';

import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://panna:panna@localhost:5433/panna',
  JWT_SECRET: 'a'.repeat(32),
};

describe('the environment', () => {
  it('accepts a valid one and fills in the defaults', () => {
    const env = validateEnv({ ...valid });
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('refuses to start without DATABASE_URL, and names it', () => {
    expect(() => validateEnv({ JWT_SECRET: valid.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('refuses a JWT secret short enough to brute force, and says why', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'tooshort' })).toThrow(/at least 32/);
  });

  it('refuses a DATABASE_URL that is not a url', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: 'localhost' })).toThrow(/DATABASE_URL/);
  });
});
