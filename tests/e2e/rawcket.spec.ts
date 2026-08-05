import { expect, test } from '@playwright/test';

function openAiEnvelope(result: unknown): string {
  return JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
}

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
  const imageChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import image' }).click();
  await (await imageChooser).setFiles({
    name: 'night.png',
    mimeType: 'image/png',
    buffer: png
  });

  await expect(page.getByLabel('Project name')).toHaveValue('night');
  await expect(page.getByText('No active edits')).toBeVisible();
  await expect(page.getByLabel('Active Recipe').getByRole('button', { name: /^Exposure / })).toHaveCount(0);
  const webGpuAvailable = await page.evaluate(async () => {
    if (!Reflect.has(navigator, 'gpu')) return false;
    return (await navigator.gpu.requestAdapter()) !== null;
  });
  await expect(page.getByText(webGpuAvailable ? 'WebGPU accelerated preview' : 'WebGL2 accelerated preview')).toBeVisible();
  const acceleratedPixel = await page.getByRole('img', { name: 'Preview of night' }).evaluate(async (element) => {
    if (!(element instanceof HTMLImageElement)) throw new Error('The accelerated preview is not an image.');
    await element.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('The accelerated preview cannot be sampled.');
    context.drawImage(element, 0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  });
  expect(acceleratedPixel[0]).toBeGreaterThan(150);
  expect(acceleratedPixel[1]).toBeGreaterThan(180);
  await page.getByRole('tab', { name: 'Manual' }).click();
  await expect(page.getByLabel('Rendered frame histogram')).toBeVisible();
  await expect(page.getByText('Essential light and color controls.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Detail Shortcut 3' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  await expect(page.getByText('Full technical control, curves, geometry, and masks.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Detail Shortcut 3' })).toBeVisible();
  await page.getByRole('tab', { name: '✦ AI Companion' }).click();
  await expect(page.getByRole('region', { name: 'Local semantic masks' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download local model' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /consent to download and store/ }).check();
  await expect(page.getByRole('button', { name: 'Download local model' })).toBeEnabled();
  await page.route('https://api.openai.com/v1/responses', async (route) => {
    const body = route.request().postDataJSON() as { text?: { format?: { name?: string } } };
    const result = body.text?.format?.name === 'rawcket_photo_opinion'
      ? { suggestedIntent: 'Shape a cinematic night portrait while keeping skin believable.', critique: 'The face carries the frame, while the bright edge can be controlled to improve hierarchy.', strengths: ['Clear subject'], opportunities: ['Tighter crop'] }
      : {
        explanation: 'A restrained tonal curve, tighter frame, and local lift give the subject more separation.',
        operations: [
          { kind: 'global-adjustment', key: 'contrast', value: 14 },
          { kind: 'global-adjustment', key: 'highlights', value: -22 },
          { kind: 'tone-curve', channel: 'rgb', interpolation: 'monotonic-cubic', points: [{ x: 0, y: 0 }, { x: 0.25, y: 0.2 }, { x: 0.75, y: 0.82 }, { x: 1, y: 1 }] },
          { kind: 'viewport', cropFrame: { x: 0.05, y: 0.05, width: 0.9, height: 0.9 }, translation: { x: 0.5, y: 0.5 }, scale: 1, rotationDegrees: 0, flipHorizontal: false, flipVertical: false, aspectRatio: null },
          { kind: 'radial-mask', center: { x: 0.5, y: 0.45 }, radiusX: 0.2, radiusY: 0.28, rotationDegrees: 0, inverted: false, opacity: 0.8, feather: 0.6, density: 1, localAdjustments: [{ key: 'exposure', value: 0.3 }] }
        ]
      };
    await route.fulfill({ status: 200, contentType: 'application/json', body: openAiEnvelope(result) });
  });
  await page.getByRole('button', { name: 'Ask Companion for an opinion' }).click();
  const aiSettings = page.getByRole('dialog', { name: 'Configure AI Companion' });
  await expect(aiSettings).toBeVisible();
  await expect(aiSettings.getByText('OpenAI API', { exact: true }).first()).toBeVisible();
  await expect(aiSettings.getByRole('link', { name: /Create or manage an OpenAI API key/ })).toHaveAttribute('href', 'https://platform.openai.com/api-keys');
  await aiSettings.getByLabel('OpenAI model').fill('test-vision-model');
  await aiSettings.getByLabel('OpenAI API key').fill('sk-e2e-test-key');
  await aiSettings.getByLabel('This tab only · never saved').check();
  await aiSettings.getByRole('button', { name: 'Use OpenAI API' }).click();
  await expect(page.getByLabel('What should RAWcket create?')).toHaveValue(/cinematic night portrait/);
  await page.getByLabel('What should RAWcket create?').fill('Create a cinematic night treatment');
  await page.getByRole('button', { name: 'Generate editable proposal' }).click();
  await expect(page.getByLabel('AI edit proposal')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Contrast: +14' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Update RGB curve' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Update crop and geometry' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Add local mask' })).toBeChecked();
  await page.getByRole('button', { name: 'Apply selected' }).click();
  await expect(page.getByRole('button', { name: /Contrast \+14/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tone Curve/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Crop & Geometry/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Local Masks/ })).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.getByRole('button', { name: 'Light Shortcut 1' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByLabel('Exposure numeric value').fill('0.25');
  await expect(page.getByRole('button', { name: /Exposure \+0.25/ })).toBeVisible();
  await page.getByRole('button', { name: 'Visual history' }).click();
  await expect(page.getByRole('dialog', { name: 'Visual history' }).getByText('Exposure: +0.25')).toBeVisible();
  await page.getByRole('button', { name: 'Close visual history' }).click();
  await expect(page.locator('.adjustment-control.modified').filter({ has: page.getByLabel('Exposure numeric value') }).getByLabel('Modified')).toBeVisible();
  await page.getByRole('button', { name: 'Reset Exposure' }).click();
  await expect(page.getByLabel('Active Recipe').getByRole('button', { name: /^Exposure / })).toHaveCount(0);
  await page.getByLabel('Exposure numeric value').fill('0.25');
  await page.getByLabel('Exposure enabled').uncheck();
  await expect(page.getByLabel('Exposure numeric value')).toBeDisabled();
  await page.getByLabel('Exposure enabled').check();
  await expect(page.getByLabel('Exposure numeric value')).toHaveValue('0.25');
  await page.getByRole('button', { name: 'After · B' }).click();
  await expect(page.getByText('Original · Before')).toBeVisible();
  await page.getByRole('button', { name: 'Before · B' }).click();
  const canvasWidthBeforeCollapse = await page.locator('.canvas-area').evaluate((element) => element.getBoundingClientRect().width);
  await page.getByRole('button', { name: 'Collapse Active Recipe' }).click();
  await expect(page.getByRole('button', { name: 'Expand Active Recipe' })).toBeVisible();
  await expect.poll(() => page.locator('.canvas-area').evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(canvasWidthBeforeCollapse);
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  const horizontalCenterDelta = await page.evaluate(() => {
    const stage = document.querySelector('.photo-stage')?.getBoundingClientRect();
    const preview = document.querySelector('.preview-surface')?.getBoundingClientRect();
    if (stage === undefined || preview === undefined) return Number.POSITIVE_INFINITY;
    return Math.abs((stage.left + stage.width / 2) - (preview.left + preview.width / 2));
  });
  expect(horizontalCenterDelta).toBeLessThan(2);
  await page.getByRole('button', { name: 'Expand Active Recipe' }).click();
  await page.getByLabel('Editing tools').getByRole('button', { name: /Crop & Geometry/ }).click();
  await page.getByLabel('Geometry composition guide').selectOption('grid');
  await expect(page.getByLabel('Fixed composition grid')).toBeVisible();
  await expect(page.locator('.composition-guide-overlay .grid-minor')).toHaveCount(16);
  await page.getByLabel('Crop aspect ratio').selectOption('1:1');
  const cropBounds = await page.locator('.fixed-guide-frame').boundingBox();
  if (cropBounds === null) throw new Error('The direct crop surface is unavailable.');
  await page.mouse.move(cropBounds.x + cropBounds.width * 0.2, cropBounds.y + cropBounds.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(cropBounds.x + cropBounds.width * 0.7, cropBounds.y + cropBounds.height * 0.8, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => Number(await page.getByLabel('Width numeric value').inputValue()) / Number(await page.getByLabel('Height numeric value').inputValue())).toBeCloseTo(0.5, 1);
  await page.getByLabel('Rotation numeric value').fill('10');
  await expect(page.getByLabel('Rotation numeric value')).toHaveValue('10');
  await page.getByLabel('Editing tools').getByRole('button', { name: 'Masks AI ready' }).click();
  await expect(page.getByText('How local masks work')).toBeVisible();
  await page.getByRole('button', { name: '+ Radial mask' }).click();
  await expect(page.getByText('Radial mask selected')).toBeVisible();
  await page.getByLabel('Local exposure numeric value').fill('1');
  await expect(page.getByRole('button', { name: /Radial 1 On/ })).toBeVisible();
  await page.getByRole('tab', { name: '✦ AI Companion' }).click();
  await page.getByRole('button', { name: 'Create and place points' }).click();
  await expect(page.getByRole('button', { name: /Smart \d+ On/ })).toBeVisible();
  await expect(page.getByText('CPU compatibility preview')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('4');
  await expect(page.locator('.curve-histogram-backdrop')).toBeVisible();
  await page.getByRole('button', { name: 'Reset channel' }).click();
  const curveGraph = page.locator('.curve-graph');
  await expect(curveGraph.locator('path.curve-line')).toHaveAttribute('d', /^M0,1 L/);
  await expect(page.getByText('Neutral curve · no control point selected')).toBeVisible();
  await expect(curveGraph.locator('circle')).toHaveCount(0);
  await expect(curveGraph.locator('path.curve-line')).toHaveCSS('stroke-width', '2px');
  const graphBounds = await curveGraph.boundingBox();
  if (graphBounds === null) throw new Error('The tone curve graph is unavailable.');
  await page.mouse.move(graphBounds.x + graphBounds.width * 0.35, graphBounds.y + graphBounds.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(graphBounds.x + graphBounds.width * 0.7, graphBounds.y + graphBounds.height * 0.4, { steps: 4 });
  await page.mouse.up();
  await expect(curveGraph.locator('circle')).toHaveCount(3);
  await expect.poll(async () => Number(await page.getByLabel('Curve point X').inputValue())).toBeGreaterThan(0.69);
  const middlePoint = curveGraph.locator('circle').nth(1);
  const pointBounds = await middlePoint.boundingBox();
  if (pointBounds === null) throw new Error('The middle tone-curve point is unavailable.');
  await page.mouse.move(pointBounds.x + pointBounds.width / 2, pointBounds.y + pointBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(graphBounds.x + graphBounds.width * 0.55, graphBounds.y + graphBounds.height * 0.4, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => Number(await page.getByLabel('Curve point X').inputValue())).toBeLessThan(0.56);
  await page.getByLabel('Curve point Y').fill('0.1');
  await expect(page.getByLabel('Curve point Y')).toHaveValue('0.1');
  await middlePoint.focus();
  await page.keyboard.press('Shift+ArrowUp');
  await expect(page.getByLabel('Curve point Y')).toHaveValue('0.11');
  await page.getByRole('button', { name: 'Copy RGB curve' }).click();
  await page.getByRole('tab', { name: 'Red' }).click();
  await page.getByRole('button', { name: 'Paste RGB to Red' }).click();
  await expect(page.locator('.curve-graph.channel-red circle')).toHaveCount(3);
  await page.getByRole('button', { name: 'Close project and return' }).click();

  await page.getByRole('button', { name: 'Rate night 4 stars' }).click();
  await expect(page.getByRole('button', { name: 'Rate night 4 stars' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Edit tags' }).click();
  await page.getByLabel('Comma-separated tags').fill('night, client');
  await page.getByRole('button', { name: 'Save tags' }).click();
  await expect(page.getByText('client', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add night to favorites' }).click();
  await expect(page.getByRole('button', { name: 'Remove night from favorites' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Search names and tags').fill('client');
  await expect(page.getByRole('button', { name: 'Open night' })).toBeVisible();
  await page.getByLabel('Favorites only').check();
  await expect(page.getByRole('button', { name: 'Open night' })).toBeVisible();
  await page.getByLabel('Minimum rating').selectOption('5');
  await expect(page.getByText('No matching projects')).toBeVisible();
  await page.getByLabel('Minimum rating').selectOption('4');
  await expect(page.getByRole('button', { name: 'Open night' })).toBeVisible();
  await page.getByRole('button', { name: 'Open night' }).click();
  await expect(page.getByRole('button', { name: /Exposure \+0.25/ })).toBeVisible();
  await page.getByRole('button', { name: 'Crop & Geometry', exact: true }).click();
  await expect(page.getByLabel('Rotation numeric value')).toHaveValue('10');
  await page.getByRole('button', { name: 'Local Masks', exact: true }).click();
  await expect(page.getByRole('button', { name: /Radial 1 On/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Smart \d+ On/ })).toBeVisible();
  await page.getByRole('button', { name: 'Tone Curve', exact: true }).click();
  await page.locator('.curve-graph circle').nth(1).click();
  await expect(page.getByLabel('Curve point Y')).toHaveValue('0.11');
  const sidecarDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save sidecar' }).click();
  const sidecarDownload = await sidecarDownloadPromise;
  expect(sidecarDownload.suggestedFilename()).toBe('night.rawcket.json');
  const sidecarPath = await sidecarDownload.path();
  await page.getByRole('button', { name: 'Clear recipe' }).click();
  await expect(page.getByText('No active edits')).toBeVisible();
  await page.getByLabel('Select a RAWcket recipe sidecar').setInputFiles(sidecarPath);
  await expect(page.getByRole('button', { name: /Exposure \+0.25/ })).toBeVisible();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByLabel('Format', { exact: true }).selectOption('png');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('night.png');
});

test('imports a photograph by dropping it onto the library', async ({ page }) => {
  await page.goto('/');
  const dataTransfer = await page.evaluateHandle(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas is unavailable in the test.');
    context.fillStyle = '#718c53';
    context.fillRect(0, 0, 2, 2);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result === null ? reject(new Error('PNG creation failed.')) : resolve(result), 'image/png'));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'dropped.png', { type: 'image/png' }));
    return transfer;
  });

  await page.dispatchEvent('.library-shell', 'dragenter', { dataTransfer });
  await expect(page.getByText('Drop photographs to import')).toBeVisible();
  await page.dispatchEvent('.library-shell', 'drop', { dataTransfer });
  await expect(page.getByText('Drop photographs to import')).toHaveCount(0);
  await expect(page.getByLabel('Project name')).toHaveValue('dropped');
  await dataTransfer.dispose();
});

test('compares multiple imports by post-edit potential and lets the photographer override the recommendation', async ({ page }) => {
  await page.goto('/');
  await page.route('https://api.openai.com/v1/responses', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: openAiEnvelope({ assessments: [
      { candidateId: 'candidate-1', score: 91, rank: 1, reasons: ['The split light can be shaped into a stronger visual hierarchy.', 'The edge remains usable for a deliberate crop.', 'The contrast supports a clearer story after editing.'], focusPotential: 'Strong graphic edges remain usable.', reframingPotential: 'A tighter vertical crop has room to breathe.', editingPotential: 'The tonal split offers flexible shaping.', visualInterest: 'The frame has immediate graphic tension.', story: 'The light-dark relationship creates a clear visual idea.' },
      { candidateId: 'candidate-2', score: 58, rank: 2, reasons: ['The frame is technically clean but visually quiet.', 'Cropping options do not reveal a stronger subject.', 'Editing can add polish but not a clearer moment.'], focusPotential: 'Technically acceptable.', reframingPotential: 'Limited subject structure.', editingPotential: 'Clean tones with modest transformation potential.', visualInterest: 'Low visual tension.', story: 'No distinct moment is visible.' }
    ] }) });
  });
  const images = await page.evaluate(() => {
    const render = (split: boolean): string => {
      const canvas = document.createElement('canvas');
      canvas.width = 8;
      canvas.height = 8;
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('Canvas is unavailable in the test.');
      context.fillStyle = split ? '#111' : '#777';
      context.fillRect(0, 0, 8, 8);
      if (split) { context.fillStyle = '#eee'; context.fillRect(4, 0, 4, 8); }
      return canvas.toDataURL('image/png').split(',')[1] ?? '';
    };
    return { sharp: render(true), soft: render(false) };
  });

  await page.getByLabel('Select one or more JPEG, PNG, or Sony ARW images').setInputFiles([
    { name: 'sharp.png', mimeType: 'image/png', buffer: Buffer.from(images.sharp, 'base64') },
    { name: 'soft.png', mimeType: 'image/png', buffer: Buffer.from(images.soft, 'base64') }
  ]);

  const aiSettings = page.getByRole('dialog', { name: 'Configure AI Companion' });
  await expect(aiSettings).toBeVisible();
  await aiSettings.getByLabel('OpenAI model').fill('test-vision-model');
  await aiSettings.getByLabel('OpenAI API key').fill('sk-e2e-test-key');
  await aiSettings.getByLabel('This tab only · never saved').check();
  await aiSettings.getByRole('button', { name: 'Use OpenAI API' }).click();

  const dialog = page.getByRole('dialog', { name: 'Choose the strongest photograph' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Recommended')).toBeVisible();
  await expect(dialog.getByText(/visual hierarchy/).first()).toBeVisible();
  await expect(dialog.getByText(/clear visual idea/).first()).toBeVisible();
  await dialog.getByRole('button', { name: /soft\.png/ }).click();
  await dialog.getByRole('button', { name: 'Continue with soft.png' }).click();
  await expect(page.getByLabel('Project name')).toHaveValue('soft');
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

  await page.getByLabel('Select one or more JPEG, PNG, or Sony ARW images').setInputFiles({
    name: 'a6600-sample.ARW',
    mimeType: 'image/x-sony-arw',
    buffer: arw
  });

  await expect(page.getByLabel('Project name')).toHaveValue('a6600-sample');
  await expect(page.getByRole('img', { name: 'Preview of a6600-sample' })).toBeVisible();
  await expect(page.getByText(/Preview up to date/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Embedded RAW preview fallback/)).toBeVisible();
  await page.getByRole('button', { name: 'Photo information' }).click();
  await expect(page.getByRole('dialog', { name: 'Photo information' })).toContainText('Sony ARW');
  await expect(page.getByRole('dialog', { name: 'Photo information' })).toContainText('6000 × 4000 px');
  await expect(page.getByText(/Embedded 8-bit preview fallback/)).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Photo information' })).toContainText('Final export will not silently use this fallback.');
  await page.getByRole('button', { name: 'Close photo information' }).click();
});
