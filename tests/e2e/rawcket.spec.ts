import { expect, test } from '@playwright/test';

test('imports, edits, saves, closes, and reopens a local project', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your photographs. Your browser.' })).toBeVisible();

  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas is unavailable in the test.');
    context.fillStyle = '#c9f06b';
    context.fillRect(0, 0, 2, 1);
    return canvas.toDataURL('image/png').split(',')[1] ?? '';
  });
  const png = Buffer.from(pngBase64, 'base64');
  await page.getByLabel('Select a JPEG, PNG, or Sony ARW image').setInputFiles({
    name: 'night.png',
    mimeType: 'image/png',
    buffer: png
  });

  await expect(page.getByLabel('Project name')).toHaveValue('night');
  await expect(page.getByLabel('Rendered frame histogram')).toBeVisible();
  await page.getByRole('button', { name: 'Generate editable proposal' }).click();
  await expect(page.getByLabel('AI edit proposal')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Contrast: +14' })).toBeChecked();
  await page.getByRole('button', { name: 'Apply selected' }).click();
  await expect(page.getByRole('button', { name: /Contrast \+14/ })).toBeVisible();
  await page.getByRole('button', { name: /Exposure/ }).click();
  await page.getByLabel('Exposure numeric value').fill('0.25');
  await expect(page.getByRole('button', { name: /Exposure \+0.25/ })).toBeVisible();
  await page.getByLabel('Exposure enabled').uncheck();
  await expect(page.getByLabel('Exposure numeric value')).toBeDisabled();
  await page.getByLabel('Exposure enabled').check();
  await expect(page.getByLabel('Exposure numeric value')).toHaveValue('0.25');
  await page.getByRole('button', { name: 'After · B' }).click();
  await expect(page.getByText('Original · Before')).toBeVisible();
  await page.getByRole('button', { name: 'Before · B' }).click();
  await page.getByRole('button', { name: 'Crop & Geometry', exact: true }).click();
  await page.getByLabel('Rotation numeric value').fill('10');
  await expect(page.getByLabel('Rotation numeric value')).toHaveValue('10');
  await page.getByRole('button', { name: 'Local Masks', exact: true }).click();
  await page.getByRole('button', { name: '+ Radial mask' }).click();
  await page.getByLabel('Local exposure numeric value').fill('1');
  await expect(page.getByRole('button', { name: /Radial 1 On/ })).toBeVisible();
  await page.getByRole('button', { name: /Local Smart Mask/ }).click();
  await expect(page.getByRole('button', { name: /Smart 2 On/ })).toBeVisible();
  await page.getByRole('button', { name: 'Tone Curve', exact: true }).click();
  await page.getByLabel('Curve point Y').fill('0.1');
  await expect(page.getByLabel('Curve point Y')).toHaveValue('0.1');
  await page.getByRole('button', { name: 'Close project and return' }).click();

  await page.getByRole('button', { name: 'Open night' }).click();
  await expect(page.getByRole('button', { name: /Exposure \+0.25/ })).toBeVisible();
  await page.getByRole('button', { name: 'Crop & Geometry', exact: true }).click();
  await expect(page.getByLabel('Rotation numeric value')).toHaveValue('10');
  await page.getByRole('button', { name: 'Local Masks', exact: true }).click();
  await expect(page.getByRole('button', { name: /Radial 1 On/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Smart 2 On/ })).toBeVisible();
  await page.getByRole('button', { name: 'Tone Curve', exact: true }).click();
  await expect(page.getByLabel('Curve point Y')).toHaveValue('0.1');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByLabel('Format').selectOption('png');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('night.png');
});

test('imports a Sony ARW container and develops its embedded preview locally', async ({ page }) => {
  await page.goto('/');
  const jpegBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 3;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas is unavailable in the test.');
    context.fillStyle = '#426da8';
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1] ?? '';
  });
  const jpeg = Buffer.from(jpegBase64, 'base64');
  const arw = Buffer.alloc(64 + jpeg.length);
  arw.write('II', 0, 'ascii');
  arw.writeUInt16LE(42, 2);
  arw.writeUInt32LE(8, 4);
  arw.writeUInt16LE(4, 8);
  const entries = [
    [0x0100, 4, 1, 6000],
    [0x0101, 4, 1, 4000],
    [0x0201, 4, 1, 64],
    [0x0202, 4, 1, jpeg.length]
  ];
  entries.forEach(([tag = 0, type = 0, count = 0, value = 0], index) => {
    const offset = 10 + index * 12;
    arw.writeUInt16LE(tag, offset);
    arw.writeUInt16LE(type, offset + 2);
    arw.writeUInt32LE(count, offset + 4);
    arw.writeUInt32LE(value, offset + 8);
  });
  arw.writeUInt32LE(0, 58);
  jpeg.copy(arw, 64);

  await page.getByLabel('Select a JPEG, PNG, or Sony ARW image').setInputFiles({
    name: 'a6600-sample.ARW',
    mimeType: 'image/x-sony-arw',
    buffer: arw
  });

  await expect(page.getByLabel('Project name')).toHaveValue('a6600-sample');
  await expect(page.getByRole('img', { name: 'Preview of a6600-sample' })).toBeVisible();
  await expect(page.getByText(/Preview up to date/)).toBeVisible();
});
