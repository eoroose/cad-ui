import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const root = resolve(new URL('.', import.meta.url).pathname);

export default defineConfig({
  root,
  test: {
    root,
    include: ['src/test/**/*.integration.test.ts'],
    testTimeout: 150_000,
    hookTimeout: 10_000,
  },
});
