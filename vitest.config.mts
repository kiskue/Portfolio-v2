import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${fromRoot('./src')}/` },
      { find: /^server-only$/, replacement: fromRoot('./tests/support/empty.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // A few suites render every replica or encode images with sharp; under the load of parallel
    // builds on one machine they can exceed the 5 s default without being wrong.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
