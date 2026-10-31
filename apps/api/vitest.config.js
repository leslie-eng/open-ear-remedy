import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.js'],
    setupFiles: ['./test/setup.js'],
    // Database tests share one Postgres database, so files must not run in parallel.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
