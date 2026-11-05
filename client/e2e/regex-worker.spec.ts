import { expect, test } from '@playwright/test';

test('a slow regex is stopped and a later search still works', async ({ page }) => {
  await page.goto('/workbench');
  await page.locator('#wbx-paste-input').fill(`${'a'.repeat(2000)}b`);
  await page.getByRole('button', { name: /carica testo|load text/i }).click();
  await expect(page.getByText(/testo incollato|pasted text/i)).toBeVisible();
  await page.getByRole('tab', { name: /laboratorio|lab/i }).click();

  const pattern = page.locator('#lab-regex-pattern');
  await pattern.fill('(a|aa)+$');
  await expect(page.getByRole('alert')).toContainText(/interrotta|stopped/i, { timeout: 12_000 });

  await pattern.fill('b');
  await expect(page.getByText(/1 corrispondenza|1 match/i).first()).toBeVisible();
});
