import { expect, test } from '@playwright/test';

test('loading a different log removes the previous report from export', async ({ page }) => {
  await page.route('**/api/analyses', async (route) => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }
    await route.fulfill({
      status: 201,
      json: {
        id: 'report-one',
        createdAt: '2026-01-01T00:00:00.000Z',
        source: 'paste',
        fileName: null,
        rawLog: 'ERROR first log',
        title: 'First report',
        severity: 'high',
        category: 'runtime',
        helpful: null,
        shareToken: null,
        report: {
          keyLines: [],
          causes: [],
          debugSteps: [],
          bugReportMarkdown: 'FIRST REPORT ONLY',
        },
      },
    });
  });

  await page.goto('/workbench');
  const input = page.locator('#wbx-paste-input');
  const load = page.getByRole('button', { name: /load text|carica testo/i });
  await input.fill('ERROR first log');
  await load.click();
  const analyze = page.getByRole('button', { name: /analyze this log|analizza questo log/i });
  await analyze.click();
  await expect(analyze).toBeEnabled();
  await page.getByRole('tab', { name: /export|esporta/i }).click();
  await expect(page.getByText('FIRST REPORT ONLY')).toBeVisible();

  await input.fill('ERROR second log');
  await load.click();
  await expect(page.getByText('FIRST REPORT ONLY')).toHaveCount(0);
  await expect(page.getByText(/analyze first|prima analizza/i)).toBeVisible();
});
