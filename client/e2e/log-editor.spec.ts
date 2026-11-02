import { expect, test } from '@playwright/test';

const LONG_LINE = 'ERROR ' + 'connect ECONNREFUSED 10.0.2.15:5432 '.repeat(8);
const LOG = ['INFO server listening', LONG_LINE, 'short', LONG_LINE].join('\n');

test('wrapped log lines keep one line number each and never scroll sideways', async ({ page }) => {
  await page.goto('/');
  await page.locator('#log-input').fill(LOG);

  const gutter = page.locator('ol li');
  const mirrorRows = page.locator('[aria-hidden="true"].invisible > div');

  // Each logical line's number is as tall as its wrapped text (the editor also pads to 20 rows).
  for (let i = 0; i < 4; i++) {
    const numberHeight = await gutter.nth(i).evaluate((el) => el.offsetHeight);
    const textHeight = await mirrorRows.nth(i).evaluate((el) => el.offsetHeight);
    expect(numberHeight, `line ${i + 1}`).toBe(textHeight);
  }
  expect(await gutter.nth(1).evaluate((el) => el.offsetHeight)).toBeGreaterThan(22);

  // Nothing is hidden to the right of the screen.
  const scroller = page
    .locator('#log-input')
    .locator('xpath=ancestor::div[contains(@class,"overflow-y-auto")]');
  const overflow = await scroller.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
