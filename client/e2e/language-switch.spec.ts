import { expect, test } from '@playwright/test';

const LOG = 'ERROR connect ECONNREFUSED 10.0.2.15:5432';

test('the language switch translates the page, keeps the typed log and is remembered', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Analyze log' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.locator('#log-input').fill(LOG);
  await page.getByRole('button', { name: 'Italiano' }).click();

  await expect(page.getByRole('button', { name: 'Analizza log' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Italiano' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('#log-input')).toHaveValue(LOG);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Analizza log' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
});
