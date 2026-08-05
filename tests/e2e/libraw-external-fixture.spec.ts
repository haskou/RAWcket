import { expect, test, type Page } from '@playwright/test';

const fixturePath = process.env.RAWCKET_ARW_FIXTURE;

async function previewSignature(page: Page): Promise<number> {
  return page.getByRole('img', { name: /Preview of/ }).evaluate((image) => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null) throw new Error('Preview signature canvas is unavailable.');
    context.drawImage(image as HTMLImageElement, 0, 0, canvas.width, canvas.height);
    return context.getImageData(0, 0, canvas.width, canvas.height).data.reduce(
      (hash, value) => ((hash * 31) ^ value) >>> 0,
      2_166_136_261
    );
  });
}

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
  const neutralDevelopedSignature = await previewSignature(page);
  await expect(page.getByRole('button', { name: 'No edits · B' })).toBeDisabled();
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
  const adjustedSignature = await previewSignature(page);
  await page.getByRole('button', { name: 'After · B' }).click();
  await expect(page.getByText('Neutral developed RAW · Before')).toBeVisible();
  await expect.poll(() => previewSignature(page)).toBe(neutralDevelopedSignature);
  expect(adjustedSignature).not.toBe(neutralDevelopedSignature);
  await page.getByRole('button', { name: 'Before · B' }).click();
  await page.getByRole('button', { name: 'Natural' }).click();
  for (const label of ['Highlights', 'Shadows', 'Vibrance', 'Clarity', 'Texture', 'Sharpness']) {
    await page.getByLabel(`${label} enabled`).uncheck();
  }
  await expect(page.getByText('Saving…')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Saved locally')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Preview up to date/)).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await expect(page.getByText(/Preview up to date/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'No edits · B' })).toBeDisabled();
  await page.evaluate(() => {
    const arm = (): void => {
      document.documentElement.dataset.rawcketReloadedUpdateStarted = 'false';
      document.documentElement.dataset.rawcketReloadedUpdateCompleted = 'false';
    };
    arm();
    new MutationObserver(() => {
      const status = document.body.innerText;
      if (status.includes('Waiting for input') || status.includes('Rendering') || status.includes('developing') || status.includes('decoding')) {
        document.documentElement.dataset.rawcketReloadedUpdateStarted = 'true';
      }
      if (document.documentElement.dataset.rawcketReloadedUpdateStarted === 'true' && status.includes('Preview up to date')) {
        document.documentElement.dataset.rawcketReloadedUpdateCompleted = 'true';
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  await page.getByRole('button', { name: 'Texture +5' }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.rawcketReloadedUpdateStarted)).toBe('false');
  await expect(page.getByText('Updating preview')).toHaveCount(0);
  await page.evaluate(() => {
    document.documentElement.dataset.rawcketReloadedUpdateStarted = 'false';
    document.documentElement.dataset.rawcketReloadedUpdateCompleted = 'false';
  });
  await page.getByLabel('Texture enabled').check();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.rawcketReloadedUpdateCompleted), { timeout: 30_000 }).toBe('true');
  await expect(page.getByText('Updating preview')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'After · B' })).toBeEnabled();
  const restoredAdjustedSignature = await previewSignature(page);
  await page.getByRole('button', { name: 'After · B' }).click();
  await expect(page.getByText('Neutral developed RAW · Before')).toBeVisible();
  await expect.poll(() => previewSignature(page)).not.toBe(restoredAdjustedSignature);
  await page.getByRole('button', { name: 'Photo information' }).click();
  const information = page.getByRole('dialog', { name: 'Photo information' });
  await expect(information, browserErrors.join('\n')).toContainText('LibRaw/WASM · linear RGB · 16-bit');
  await expect(information).toContainText('Quantization to 8-bit occurs only when the displayed preview is encoded.');
  await expect(page.getByText(/Embedded RAW preview fallback/)).toHaveCount(0);
});
