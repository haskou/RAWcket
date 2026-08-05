import { expect, test } from '@playwright/test';

const fixturePath = process.env.RAWCKET_ARW_FIXTURE;

test('develops an external camera RAW through the 16-bit LibRaw/WASM path', async ({ page }) => {
  test.skip(fixturePath === undefined, 'Set RAWCKET_ARW_FIXTURE to a legally redistributable or locally owned ARW fixture.');
  test.setTimeout(120_000);
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/');
  await expect.poll(() => page.evaluate(() => crossOriginIsolated)).toBe(true);
  await page.getByLabel('Select one or more JPEG, PNG, or Sony ARW images').setInputFiles(fixturePath ?? '');

  await expect(page.getByLabel('Project name')).toBeVisible();
  await expect(page.getByText(/Preview up to date/)).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Photo information' }).click();
  const information = page.getByRole('dialog', { name: 'Photo information' });
  await expect(information, browserErrors.join('\n')).toContainText('LibRaw/WASM · linear RGB · 16-bit');
  await expect(information).toContainText('Quantization to 8-bit occurs only when the displayed preview is encoded.');
  await expect(page.getByText(/Embedded RAW preview fallback/)).toHaveCount(0);
});
