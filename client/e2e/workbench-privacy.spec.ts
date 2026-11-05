import { expect, test } from '@playwright/test';

test('the Workbench applies the saved anonymization choice before sending a log', async ({
  page,
}) => {
  let submittedLog = '';
  await page.route('**/api/analyses', async (route) => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }
    submittedLog = route.request().postDataJSON().rawLog as string;
    await route.fulfill({ status: 500, json: { error: { message: 'Test response' } } });
  });

  await page.goto('/');
  const anonymize = page.getByRole('checkbox', {
    name: /anonymize before sending|anonimizza prima/i,
  });
  await page.getByText(/anonymize before sending|anonimizza prima/i).click();
  await expect(anonymize).toBeChecked();
  await page.getByRole('link', { name: 'Workbench', exact: true }).click();
  await page.locator('#wbx-paste-input').fill('ERROR from 203.0.113.9 contact ana@example.com');
  await page.getByRole('button', { name: /load text|carica testo/i }).click();
  await expect(page.getByText(/pasted text|testo incollato/i)).toBeVisible();
  await page.getByRole('button', { name: /analyze this log|analizza questo log/i }).click();
  await expect.poll(() => submittedLog).not.toBe('');
  expect(submittedLog).not.toContain('203.0.113.9');
  expect(submittedLog).not.toContain('ana@example.com');
});

test('anonymized uploads omit the file name on both analysis paths', async ({ page }) => {
  const submissions: Array<{ rawLog: string; fileName?: string; source?: string }> = [];
  await page.route('**/api/analyses', async (route) => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 500, json: { error: { message: 'Test response' } } });
  });

  await page.goto('/');
  await page.getByText(/anonymize before sending|anonimizza prima/i).click();
  const file = {
    name: 'ana@example.com.log',
    mimeType: 'text/plain',
    buffer: Buffer.from('ERROR 203.0.113.9'),
  };
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.locator('#log-input')).toHaveValue('ERROR 203.0.113.9');
  await page.getByRole('button', { name: /analyze log|analizza log/i }).click();
  await expect.poll(() => submissions.length).toBe(1);

  await page.getByRole('link', { name: 'Workbench', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(
    page.getByRole('button', { name: /analyze this log|analizza questo log/i }),
  ).toBeEnabled();
  await page.getByRole('button', { name: /analyze this log|analizza questo log/i }).click();
  await expect.poll(() => submissions.length).toBe(2);
  for (const submission of submissions) {
    expect(submission.source).toBe('upload');
    expect(submission.fileName).toBeUndefined();
    expect(submission.rawLog).not.toContain('203.0.113.9');
  }
});
