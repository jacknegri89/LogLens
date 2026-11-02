import { defineConfig, devices } from '@playwright/test';

// Runs against the Vite dev server; the analyze page needs no API for these checks.
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5173' },
  projects: [{ name: 'phone', use: { ...devices['Pixel 5'], channel: 'chrome' } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
