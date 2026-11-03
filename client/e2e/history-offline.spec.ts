import { expect, test, type Page } from '@playwright/test';

function makeRecord(index: number) {
  return {
    id: `analysis-${index}`,
    createdAt: new Date(Date.UTC(2026, 5, 15, 12, index)).toISOString(),
    source: 'paste',
    fileName: null,
    rawLog: `ERROR connect ECONNREFUSED 10.0.2.15:${5430 + index}`,
    title: `Database refused connection ${index}`,
    severity: 'high',
    category: 'database',
    report: {
      keyLines: [`ERROR connect ECONNREFUSED 10.0.2.15:${5430 + index}`],
      causes: ['The database is not running'],
      debugSteps: ['Start the database'],
      bugReportMarkdown: '# Bug',
    },
    helpful: null,
    shareToken: null,
  };
}

function toSummary({
  id,
  createdAt,
  source,
  title,
  severity,
  category,
}: ReturnType<typeof makeRecord>) {
  return { id, createdAt, source, title, severity, category };
}

/** Mocked API: analyses can be created, the list can be switched to a network failure. */
async function mockApi(page: Page, state: { serverDown: boolean; deleted: string[] }) {
  const records = [makeRecord(1), makeRecord(2)];
  let created = 0;
  await page.route(/\/api\/analyses(\/[^/]*)?$/, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST') return route.fulfill({ json: records[created++] });
    if (state.serverDown) return route.abort('connectionrefused');
    if (request.method() === 'DELETE') {
      state.deleted.push(path);
      return route.fulfill({ json: { deleted: 1 } });
    }
    return route.fulfill({ json: records.map(toSummary).reverse() });
  });
}

async function analyzeLog(page: Page, index: number) {
  await page.goto('/');
  await page.locator('#log-input').fill(makeRecord(index).rawLog);
  const created = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && response.url().includes('/api/analyses'),
  );
  await page.getByRole('button', { name: 'Analyze log' }).click();
  await created;
}

test('with the server unreachable the history shows the copy saved in this browser', async ({
  page,
}) => {
  const state = { serverDown: false, deleted: [] as string[] };
  await mockApi(page, state);
  await analyzeLog(page, 1);
  await analyzeLog(page, 2);

  state.serverDown = true;
  await page.goto('/history');

  await expect(page.getByRole('status')).toContainText('Showing the copy saved in this browser');
  await expect(page.getByRole('link', { name: /Database refused connection/ })).toHaveCount(2);

  await page.getByRole('link', { name: /Database refused connection 2/ }).click();
  await expect(page.getByRole('status')).toContainText('the server cannot be reached');
  await expect(page.getByRole('button', { name: 'Create link' })).toHaveCount(0);
});

test('removing a card calls DELETE for that analysis and the card disappears', async ({ page }) => {
  const state = { serverDown: false, deleted: [] as string[] };
  await mockApi(page, state);
  await analyzeLog(page, 1);
  await analyzeLog(page, 2);

  await page.goto('/history');
  await expect(page.getByRole('status')).toHaveCount(0);
  const cards = page.getByRole('link', { name: /Database refused connection/ });
  await expect(cards).toHaveCount(2);

  await page
    .getByRole('button', { name: /Remove analysis: Database refused connection 1/ })
    .click();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();

  await expect(cards).toHaveCount(1);
  await expect(page.getByText('1 on file')).toBeVisible();
  expect(state.deleted).toEqual(['/api/analyses/analysis-1']);

  state.serverDown = true;
  await page.goto('/history');
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Database refused connection 2');
});
