import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'benchmarks/**/*.test.ts'],
    // Modules that read the config need a database URL to load; tests never connect to it.
    env: { DATABASE_URL: 'postgresql://test:test@localhost:5432/test' },
  },
});
