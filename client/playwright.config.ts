import { defineConfig, devices } from '@playwright/test';

let browserChannel: string | undefined;
if (!process.env.CI) {
  browserChannel = 'chrome';
}

// Runs against the Vite dev server; the analyze page needs no API for these checks.
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: 'http://localhost:5173' },
  // On a developer machine the installed Chrome is used; CI runs the Chromium that
  // `playwright install` downloads.
  projects: [
    {
      name: 'phone',
      use: { ...devices['Pixel 5'], channel: browserChannel },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
