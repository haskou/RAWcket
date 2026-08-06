import { expect, test, type Page } from '@playwright/test';

const rawFixture = process.env.RAWCKET_ARW_FIXTURE;
const jpegFixture = process.env.RAWCKET_JPEG_FIXTURE;

type PreviewStatistics = {
  luminanceP05: number;
  luminanceP50: number;
  luminanceP95: number;
  meanSaturation: number;
};

async function waitForImport(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Import photographs' });
  await expect(dialog.getByRole('button', { name: 'Choose photographs' })).toBeEnabled({ timeout: 60_000 });
  await dialog.getByRole('button', { name: 'Close import' }).click();
}

async function previewStatistics(page: Page): Promise<PreviewStatistics> {
  return page.getByRole('img', { name: /Preview of/ }).evaluate((image) => {
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 128;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null) throw new Error('Preview statistics canvas is unavailable.');
    context.drawImage(image as HTMLImageElement, 0, 0, canvas.width, canvas.height);
    const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const luminances: number[] = [];
    let saturation = 0;
    for (let index = 0; index < bytes.length; index += 4) {
      const red = (bytes[index] ?? 0) / 255;
      const green = (bytes[index + 1] ?? 0) / 255;
      const blue = (bytes[index + 2] ?? 0) / 255;
      luminances.push(red * 0.2126 + green * 0.7152 + blue * 0.0722);
      const maximum = Math.max(red, green, blue);
      saturation += maximum <= 0 ? 0 : (maximum - Math.min(red, green, blue)) / maximum;
    }
    luminances.sort((left, right) => left - right);
    const percentile = (fraction: number): number => luminances[Math.floor(luminances.length * fraction)] ?? 0;
    return {
      luminanceP05: percentile(0.05),
      luminanceP50: percentile(0.5),
      luminanceP95: percentile(0.95),
      meanSaturation: saturation / luminances.length
    };
  });
}

test('uses a matching camera JPEG as the RAW baseline quality floor', async ({ page }) => {
  test.skip(rawFixture === undefined || jpegFixture === undefined, 'Set RAWCKET_ARW_FIXTURE and RAWCKET_JPEG_FIXTURE to matching, locally owned files.');
  test.setTimeout(180_000);

  await page.goto('/');
  await waitForImport(page);
  await page.getByLabel('Select one or more JPEG, PNG, or Sony ARW images').setInputFiles([
    rawFixture ?? '',
    jpegFixture ?? ''
  ]);
  await expect(page.getByLabel('Project name')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/Preview up to date/)).toBeVisible({ timeout: 60_000 });
  const calibratedRaw = await previewStatistics(page);

  await page.goto('/');
  await waitForImport(page);
  await page.getByLabel('Select one or more JPEG, PNG, or Sony ARW images').setInputFiles(jpegFixture ?? '');
  await expect(page.getByLabel('Project name')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Preview up to date/)).toBeVisible({ timeout: 60_000 });
  const cameraJpeg = await previewStatistics(page);
  const comparison = JSON.stringify({ calibratedRaw, cameraJpeg });

  expect(Math.abs(calibratedRaw.luminanceP05 - cameraJpeg.luminanceP05), comparison).toBeLessThan(0.035);
  expect(Math.abs(calibratedRaw.luminanceP50 - cameraJpeg.luminanceP50), comparison).toBeLessThan(0.04);
  expect(Math.abs(calibratedRaw.luminanceP95 - cameraJpeg.luminanceP95), comparison).toBeLessThan(0.04);
  expect(Math.abs(calibratedRaw.meanSaturation - cameraJpeg.meanSaturation), comparison).toBeLessThan(0.05);
});
