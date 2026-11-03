import { defineConfig } from 'vitest/config';

// Unit tests live next to the code in src; Playwright keeps e2e/.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
