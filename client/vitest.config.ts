import { defineConfig } from 'vitest/config';

// Unit tests live next to the code in src and plugins; Playwright keeps e2e/.
export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'plugins/**/*.test.ts'] },
});
