import { describe, expect, it } from 'vitest';

import { validateEnv } from '../../config/env.js';

import { devSignInEnabled } from './auth.module.js';

const base = {
  DATABASE_URL: 'postgresql://panna:panna@localhost:5433/panna',
  JWT_SECRET: 'a'.repeat(32),
};

describe('the development sign-in gates', () => {
  it('is off unless asked for, so a fresh checkout has no extra door', () => {
    expect(devSignInEnabled(validateEnv({ ...base }))).toBe(false);
  });

  it('is on in development when asked for', () => {
    const env = validateEnv({ ...base, ALLOW_DEV_SIGN_IN: 'true', NODE_ENV: 'development' });
    expect(devSignInEnabled(env)).toBe(true);
  });

  /**
   * Gate two. The unsafe combination is not merely ignored: the API will not start, so
   * a bad deploy fails loudly instead of quietly serving a sign-in with no provider.
   */
  it('refuses to validate an environment that is production with the flag on', () => {
    expect(() =>
      validateEnv({ ...base, ALLOW_DEV_SIGN_IN: 'true', NODE_ENV: 'production' }),
    ).toThrow(/ALLOW_DEV_SIGN_IN/);
  });

  it('stays off in production even if the gate function is reached directly', () => {
    expect(devSignInEnabled({ NODE_ENV: 'production', ALLOW_DEV_SIGN_IN: true })).toBe(false);
  });
});
