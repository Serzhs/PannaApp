import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // One worker: every test truncates shared tables, so they cannot run against the
    // same database in parallel.
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    setupFiles: ['./src/test/setup.ts'],
  },
});
