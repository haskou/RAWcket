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
  await page.getByRole('button', { name: 'Import image' }).click();
  const importDialog = page.getByRole('dialog', { name: 'Import photographs' });
  await expect(importDialog.getByRole('button', { name: 'Choose photographs' })).toBeEnabled({ timeout: 60_000 });
  await importDialog.getByRole('button', { name: 'Close import' }).click();
  await page.getByLabel('Select one or more JPEG, PNG, or Sony ARW images').setInputFiles(fixturePath ?? '');

  await expect(page.getByLabel('Project name')).toBeVisible();
  await expect(page.getByText(/Preview up to date/)).toBeVisible({ timeout: 60_000 });
  const preview = page.getByRole('img', { name: /Preview of/ });
  const neutralDevelopedSource = await preview.getAttribute('src');
  await page.getByRole('button', { name: 'After · B' }).click();
  await expect(page.getByText('Neutral developed RAW · Before')).toBeVisible();
  await expect(preview).toHaveAttribute('src', neutralDevelopedSource ?? '');
  await page.getByRole('tab', { name: 'Manual' }).click();
  await page.evaluate(() => {
    document.documentElement.dataset.rawcketSawRepeatedDecode = 'false';
    document.documentElement.dataset.rawcketSawPreviewUpdate = 'false';
    document.documentElement.dataset.rawcketCompletedPreviewUpdate = 'false';
    new MutationObserver(() => {
      const status = document.body.innerText;
      if (status.includes('decoding')) {
        document.documentElement.dataset.rawcketSawRepeatedDecode = 'true';
      }
      if (status.includes('Waiting for input') || status.includes('Rendering') || status.includes('developing')) {
        document.documentElement.dataset.rawcketSawPreviewUpdate = 'true';
      }
      if (document.documentElement.dataset.rawcketSawPreviewUpdate === 'true' && status.includes('Preview up to date')) {
        document.documentElement.dataset.rawcketCompletedPreviewUpdate = 'true';
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  await page.getByLabel('Exposure numeric value').fill('0.5');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.rawcketCompletedPreviewUpdate), { timeout: 30_000 }).toBe('true');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.rawcketSawRepeatedDecode)).toBe('false');
  await page.getByRole('button', { name: 'Photo information' }).click();
  const information = page.getByRole('dialog', { name: 'Photo information' });
  await expect(information, browserErrors.join('\n')).toContainText('LibRaw/WASM · linear RGB · 16-bit');
  await expect(information).toContainText('Quantization to 8-bit occurs only when the displayed preview is encoded.');
  await expect(page.getByText(/Embedded RAW preview fallback/)).toHaveCount(0);
});
