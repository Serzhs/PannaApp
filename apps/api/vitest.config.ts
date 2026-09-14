import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Every test truncates shared tables, so they cannot run against the same
    // database at the same time.
    fileParallelism: false,
    maxWorkers: 1,
    setupFiles: ['./src/test/setup.ts'],
  },
});
