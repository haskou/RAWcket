import { expect, test } from '@playwright/test';

function openAiEnvelope(result: unknown): string {
  return JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
}

test.beforeEach(async ({ page }) => {
  await page.route('https://huggingface.co/**', (route) => route.abort('failed'));
});

test('imports, edits, saves, closes, and reopens a local project', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();

  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas is unavailable in the test.');
    context.fillStyle = '#c9f06b';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#172019';
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(0, 140);
    context.lineTo(canvas.width, 100);
    context.stroke();
    return canvas.toDataURL('image/png').split(',')[1] ?? '';
  });
  const png = Buffer.from(pngBase64, 'base64');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const importDialog = page.getByRole('dialog', { name: 'Import photographs' });
  await expect(importDialog).toBeVisible();
  await expect(importDialog.getByText(/JPEG, PNG, or Sony ARW/)).toBeVisible();
  await expect(importDialog.getByText(/automatically downloads/)).toBeVisible();
  const imageChooser = page.waitForEvent('filechooser');
  await importDialog.getByRole('button', { name: 'Choose photographs' }).click();
  await (await imageChooser).setFiles({
    name: 'night.png',
    mimeType: 'image/png',
    buffer: png
  });

  await expect(page.getByLabel('Project name')).toHaveValue('night');
  await expect(page.getByRole('navigation', { name: 'Spatial tools' })).toHaveCount(0);
  for (const [tab, icon] of [['Edit', '☼'], ['Crop', '⌗'], ['Masks', '◐'], ['AI', '✦'], ['History', '◷']] as const) {
    await expect(page.getByRole('tab', { name: tab }).locator('span')).toHaveText(icon);
  }
  const recipeBounds = await page.getByRole('complementary', { name: 'Active Recipe', exact: true }).boundingBox();
  const canvasAreaBounds = await page.locator('.canvas-area').boundingBox();
  if (recipeBounds === null || canvasAreaBounds === null) throw new Error('The desktop editor columns are unavailable.');
  expect(recipeBounds.x + recipeBounds.width).toBeLessThanOrEqual(canvasAreaBounds.x + 1);
  await page.getByRole('button', { name: 'Collapse Active Recipe' }).click();
  await expect(page.getByRole('complementary', { name: 'Active Recipe collapsed', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Expand Active Recipe' }).click();
  await expect(page.getByRole('complementary', { name: 'Active Recipe', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByText('No active edits')).toBeVisible();
  await expect(
    page
      .getByRole('complementary', { name: 'Active Recipe', exact: true })
      .getByRole('button', { name: /^Exposure / }),
  ).toHaveCount(0);
  const webGpuAvailable = await page.evaluate(async () => {
    if (!Reflect.has(navigator, 'gpu')) return false;
    return (await navigator.gpu.requestAdapter()) !== null;
  });
  await expect(page.getByText(new RegExp(webGpuAvailable ? 'WebGPU' : 'WebGL2'))).toBeVisible();
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
  await page.getByRole('tab', { name: 'Edit' }).click();
  await expect(page.getByLabel('Rendered frame histogram')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Detail', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Masks' }).click();
  await expect(page.getByRole('region', { name: 'Local semantic masks' })).toBeVisible();
  await expect(page.getByText(/prepared automatically/)).toBeVisible();
  await page.getByRole('tab', { name: 'AI' }).click();
  await expect(page.getByRole('region', { name: 'Local semantic masks' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ask AI for an opinion' })).toBeVisible();
  let aiRequestCount = 0;
  await page.route('https://api.openai.com/v1/responses', async (route) => {
    aiRequestCount += 1;
    const result = {
        suggestedIntent: 'Shape a cinematic night portrait while keeping skin believable.',
        critique: 'The face carries the frame, while the bright edge can be controlled to improve hierarchy.',
        strengths: ['Clear subject'], opportunities: ['Tighter crop'],
        explanation: 'A restrained tonal curve, tighter frame, and local lift give the subject more separation.',
        operations: [
          { kind: 'global-adjustment', key: 'contrast', value: 14 },
          { kind: 'global-adjustment', key: 'highlights', value: -22 },
          { kind: 'tone-curve', channel: 'rgb', interpolation: 'monotonic-cubic', points: [{ x: 0, y: 0 }, { x: 0.25, y: 0.2 }, { x: 0.75, y: 0.82 }, { x: 1, y: 1 }] },
          { kind: 'viewport', cropFrame: { x: 0.05, y: 0.05, width: 0.9, height: 0.9 }, translation: { x: 0.5, y: 0.5 }, scale: 1, rotationDegrees: 0, horizontalPerspective: 0, verticalPerspective: 0, flipHorizontal: false, flipVertical: false, aspectRatio: null },
          { kind: 'radial-mask', center: { x: 0.5, y: 0.45 }, radiusX: 0.2, radiusY: 0.28, rotationDegrees: 0, inverted: false, opacity: 0.8, feather: 0.6, density: 1, localAdjustments: [{ key: 'exposure', value: 0.3 }] }
        ]
      };
    await route.fulfill({ status: 200, contentType: 'application/json', body: openAiEnvelope(result) });
  });
  await page.getByLabel('What should RAWcket create?').fill('Create a cinematic night portrait with a tighter crop.');
  await page.getByRole('button', { name: 'Create recipe' }).click();
  const aiSettings = page.getByRole('dialog', { name: 'Configure AI Companion' });
  await expect(aiSettings).toBeVisible();
  await expect(aiSettings.getByText('OpenAI API', { exact: true }).first()).toBeVisible();
  await expect(aiSettings.getByRole('link', { name: /Create or manage an OpenAI API key/ })).toHaveAttribute('href', 'https://platform.openai.com/api-keys');
  await aiSettings.getByLabel('OpenAI model').fill('test-vision-model');
  await aiSettings.getByLabel('OpenAI API key').fill('sk-e2e-test-key');
  await aiSettings.getByLabel('This tab only · never saved').check();
  await aiSettings.getByRole('button', { name: 'Use OpenAI API' }).click();
  await expect(page.getByLabel('What should RAWcket create?')).toHaveValue(/cinematic night portrait/);
  await expect(page.getByLabel('AI edit proposal')).toBeVisible();
  expect(aiRequestCount).toBe(1);
  await expect(page.getByRole('checkbox', { name: 'Contrast: +14' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Update RGB curve' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Update crop and geometry' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Add local mask' })).toBeChecked();
  await page.getByRole('button', { name: 'Apply selected' }).click();
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByRole('button', { name: /Contrast \+14/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tone Curve/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Crop & Geometry/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Local Masks/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Apply Auto Enhance' }).click();
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByRole('button', { name: /Tone Curve/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Crop & Geometry/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Local Masks/ })).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.getByRole('button', { name: 'Light', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await page.getByLabel('Exposure numeric value').fill('0.25');
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByRole('button', { name: /Exposure \+0.25/ })).toBeVisible();
  await page.keyboard.press('h');
  await expect(page.getByRole('dialog', { name: 'Visual history' }).getByText('Exposure: +0.25')).toBeVisible();
  await page.getByRole('button', { name: 'Close visual history' }).click();
  await page.getByRole('tab', { name: 'Edit' }).click();
  await expect(page.locator('.adjustment-control.modified').filter({ has: page.getByLabel('Exposure numeric value') }).getByLabel('Modified')).toBeVisible();
  await page.getByRole('button', { name: 'Reset Exposure' }).click();
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(
    page
      .getByRole('complementary', { name: 'Active Recipe', exact: true })
      .getByRole('button', { name: /^Exposure / }),
  ).toHaveCount(0);
  await page.getByRole('tab', { name: 'Edit' }).click();
  await page.getByLabel('Exposure numeric value').fill('0.25');
  await page.getByRole('button', { name: 'Disable Exposure' }).click();
  await expect(page.getByLabel('Exposure numeric value')).toBeDisabled();
  await page.getByRole('button', { name: 'Enable Exposure' }).click();
  await expect(page.getByLabel('Exposure numeric value')).toHaveValue('0.25');
  await page.getByRole('tab', { name: 'Edit' }).click();
  await page.getByLabel('Preview zoom').fill('1.5');
  await page.keyboard.press('ArrowRight');
  const viewportBeforeComparison = await page.locator('.preview-surface').getAttribute('style');
  await page.getByRole('button', { name: 'After B' }).click();
  await expect(page.getByText('Original · Before')).toBeVisible();
  await expect(page.locator('.preview-surface')).toHaveAttribute('style', viewportBeforeComparison ?? '');
  await page.getByRole('button', { name: 'Before B' }).click();
  await expect(page.locator('.preview-surface')).toHaveAttribute('style', viewportBeforeComparison ?? '');
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  const horizontalCenterDelta = await page.evaluate(() => {
    const stage = document.querySelector('.photo-stage')?.getBoundingClientRect();
    const preview = document.querySelector('.preview-surface')?.getBoundingClientRect();
    if (stage === undefined || preview === undefined) return Number.POSITIVE_INFINITY;
    return Math.abs((stage.left + stage.width / 2) - (preview.left + preview.width / 2));
  });
  expect(horizontalCenterDelta).toBeLessThan(2);
  await page.getByRole('button', { name: /Crop/ }).first().click();
  await expect(page.getByRole('toolbar', { name: 'Contextual crop tools' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rotate crop left 90 degrees' })).toBeVisible();
  await page.getByRole('button', { name: 'Auto straighten · local' }).click();
  await expect(page.getByText(/Applied [+-]\d+\.\d° from local edge evidence/)).toBeVisible();
  await expect.poll(async () => Math.abs(Number(await page.getByLabel('Rotation numeric value').inputValue()))).toBeGreaterThan(3);
  await page.getByLabel('Geometry composition guide').selectOption('grid');
  await expect(page.getByLabel('Fixed composition grid')).toBeVisible();
  await expect(page.locator('.composition-guide-overlay .grid-minor')).toHaveCount(16);
  const workspaceGuideAlignment = await page.evaluate(() => {
    const stage = document.querySelector('.photo-stage')?.getBoundingClientRect();
    const guide = document.querySelector('.workspace-guide')?.getBoundingClientRect();
    if (stage === undefined || guide === undefined) return Number.POSITIVE_INFINITY;
    return Math.max(Math.abs(stage.left - guide.left), Math.abs(stage.top - guide.top), Math.abs(stage.width - guide.width), Math.abs(stage.height - guide.height));
  });
  expect(workspaceGuideAlignment).toBeLessThan(2);
  await page.getByLabel('Geometry composition guide').selectOption('thirds');
  await page.getByLabel('Preview zoom').fill('1.5');
  await page.keyboard.press('ArrowRight');
  const imageGuideAlignment = await page.evaluate(() => {
    const preview = document.querySelector('.preview-surface')?.getBoundingClientRect();
    const guide = document.querySelector('.fixed-guide-frame')?.getBoundingClientRect();
    if (preview === undefined || guide === undefined) return Number.POSITIVE_INFINITY;
    return Math.max(Math.abs(preview.left - guide.left), Math.abs(preview.top - guide.top), Math.abs(preview.width - guide.width), Math.abs(preview.height - guide.height));
  });
  expect(imageGuideAlignment).toBeLessThan(2);
  await page.getByRole('button', { name: 'Clear crop' }).click();
  await expect(page.getByLabel('Width numeric value')).toHaveValue('1');
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.getByLabel('Crop aspect ratio').selectOption('1:1');
  const cropBounds = await page.locator('.fixed-guide-frame').boundingBox();
  if (cropBounds === null) throw new Error('The direct crop surface is unavailable.');
  await page.mouse.move(cropBounds.x + cropBounds.width * 0.2, cropBounds.y + cropBounds.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(cropBounds.x + cropBounds.width * 0.7, cropBounds.y + cropBounds.height * 0.8, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => Number(await page.getByLabel('Width numeric value').inputValue()) / Number(await page.getByLabel('Height numeric value').inputValue())).toBeCloseTo(0.5, 1);
  await page.getByLabel('Left numeric value').fill('0.2');
  await page.getByLabel('Top numeric value').fill('0.2');
  await page.getByLabel('Width numeric value').fill('0.3');
  await page.getByLabel('Height numeric value').fill('0.6');
  await expect(page.locator('.crop-selection-frame')).toHaveAttribute('style', /width: 30%/);
  await expect(page.locator('.crop-selection-shade')).toHaveCount(4);
  await expect(page.getByLabel('Crop composition guide')).toBeVisible();
  await expect(page.getByLabel('Image composition guide')).toHaveCount(0);
  const cropGuideAlignment = await page.evaluate(() => {
    const crop = document.querySelector('.crop-selection-frame')?.getBoundingClientRect();
    const guide = document.querySelector('.crop-guide')?.getBoundingClientRect();
    if (crop === undefined || guide === undefined) return Number.POSITIVE_INFINITY;
    return Math.max(
      Math.abs(crop.left - guide.left),
      Math.abs(crop.top - guide.top),
      Math.abs(crop.right - guide.right),
      Math.abs(crop.bottom - guide.bottom)
    );
  });
  expect(cropGuideAlignment).toBeLessThan(2);
  await expect.poll(() => page.evaluate(() => {
    const preview = document.querySelector('.source-preview')?.getBoundingClientRect();
    const guide = document.querySelector('.fixed-guide-frame')?.getBoundingClientRect();
    if (preview === undefined || guide === undefined) return Number.POSITIVE_INFINITY;
    return Math.max(
      Math.abs(preview.left - guide.left),
      Math.abs(preview.top - guide.top),
      Math.abs(preview.right - guide.right),
      Math.abs(preview.bottom - guide.bottom)
    );
  })).toBeLessThan(1);
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  const cropCenterDelta = await page.evaluate(() => {
    const stageElement = document.querySelector<HTMLElement>('.photo-stage');
    const crop = document.querySelector('.crop-selection-frame')?.getBoundingClientRect();
    if (stageElement === null || crop === undefined) return Number.POSITIVE_INFINITY;
    const stage = stageElement.getBoundingClientRect();
    const styles = getComputedStyle(stageElement);
    const left = Number.parseFloat(styles.paddingLeft);
    const right = Number.parseFloat(styles.paddingRight);
    const top = Number.parseFloat(styles.paddingTop);
    const bottom = Number.parseFloat(styles.paddingBottom);
    return Math.max(
      Math.abs((stage.left + left + (stage.width - left - right) / 2) - (crop.left + crop.width / 2)),
      Math.abs((stage.top + top + (stage.height - top - bottom) / 2) - (crop.top + crop.height / 2))
    );
  });
  expect(cropCenterDelta).toBeLessThan(2);
  const widthBeforeCornerResize = Number(await page.getByLabel('Width numeric value').inputValue());
  const resizeHandleBounds = await page.locator('[data-crop-handle="bottom-right"]').boundingBox();
  if (resizeHandleBounds === null) throw new Error('The placed crop resize handle is unavailable.');
  const resizeHandleCenter = { x: resizeHandleBounds.x + resizeHandleBounds.width / 2, y: resizeHandleBounds.y + resizeHandleBounds.height / 2 };
  await page.mouse.move(resizeHandleCenter.x, resizeHandleCenter.y);
  await page.mouse.down();
  await page.mouse.move(resizeHandleCenter.x + 30, resizeHandleCenter.y + 30, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => Number(await page.getByLabel('Width numeric value').inputValue())).toBeGreaterThan(widthBeforeCornerResize);
  await expect.poll(async () => Number(await page.getByLabel('Width numeric value').inputValue()) / Number(await page.getByLabel('Height numeric value').inputValue())).toBeCloseTo(0.5, 1);
  await page.getByLabel('Left numeric value').fill('0.2');
  await page.getByLabel('Top numeric value').fill('0.2');
  await page.getByLabel('Width numeric value').fill('0.3');
  await page.getByLabel('Height numeric value').fill('0.6');
  await page.getByLabel('Crop aspect ratio').selectOption('free');
  const movableCropBounds = await page.locator('.fixed-guide-frame').boundingBox();
  if (movableCropBounds === null) throw new Error('The movable crop surface is unavailable.');
  await page.mouse.move(movableCropBounds.x + movableCropBounds.width * 0.35, movableCropBounds.y + movableCropBounds.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(movableCropBounds.x + movableCropBounds.width * 0.45, movableCropBounds.y + movableCropBounds.height * 0.55, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => Number(await page.getByLabel('Left numeric value').inputValue())).toBeCloseTo(0.3, 2);
  await expect.poll(async () => Number(await page.getByLabel('Top numeric value').inputValue())).toBeCloseTo(0.25, 2);
  await expect(page.getByLabel('Width numeric value')).toHaveValue('0.3');
  await expect(page.getByLabel('Height numeric value')).toHaveValue('0.6');
  await page.getByRole('button', { name: 'Clear crop' }).click();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await expect(page.getByLabel('Crop aspect ratio')).toHaveValue('free');
  const freeCropBounds = await page.locator('.fixed-guide-frame').boundingBox();
  if (freeCropBounds === null) throw new Error('The free crop surface is unavailable.');
  await page.mouse.move(freeCropBounds.x + freeCropBounds.width * 0.1, freeCropBounds.y + freeCropBounds.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(freeCropBounds.x + freeCropBounds.width * 0.8, freeCropBounds.y + freeCropBounds.height * 0.45, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => Number(await page.getByLabel('Width numeric value').inputValue())).toBeCloseTo(0.7, 2);
  await expect.poll(async () => Number(await page.getByLabel('Height numeric value').inputValue())).toBeCloseTo(0.25, 2);
  await page.getByLabel('Rotation numeric value').fill('10');
  await expect(page.getByLabel('Rotation numeric value')).toHaveValue('10');
  await page.getByLabel('Vertical perspective numeric value').fill('18');
  await page.getByLabel('Horizontal perspective numeric value').fill('-12');
  await expect(page.getByLabel('Vertical perspective numeric value')).toHaveValue('18');
  await expect(page.getByLabel('Horizontal perspective numeric value')).toHaveValue('-12');
  await page.getByRole('tab', { name: 'Masks' }).click();
  await expect(page.getByText('How local masks work')).toBeVisible();
  await page.getByRole('button', { name: '+ Radial mask' }).click();
  await expect(page.getByText('Radial mask selected')).toBeVisible();
  await expect(page.getByText(/Editing Radial \d+/)).toBeVisible();
  const editedRadialTitle = await page.locator('.mask-list button.active strong').textContent();
  if (editedRadialTitle === null) throw new Error('The edited radial mask row is unavailable.');
  await page.getByLabel('Local exposure numeric value').fill('1');
  await page.getByText('Local tone curves').click();
  const localCurveGraph = page.locator('.local-curve-controls .curve-graph');
  const localCurveBounds = await localCurveGraph.boundingBox();
  if (localCurveBounds === null) throw new Error('The local tone curve graph is unavailable.');
  await localCurveGraph.click({ position: { x: localCurveBounds.width * 0.35, y: localCurveBounds.height * 0.38 } });
  await expect(localCurveGraph.locator('circle')).toHaveCount(3);
  await expect(page.getByRole('button', { name: /Radial 1 On/ })).toBeVisible();
  await page.getByRole('button', { name: '+ Brush mask' }).click();
  await expect(page.getByText('Brush mask selected')).toBeVisible();
  await page.getByLabel('Expand / contract numeric value').fill('0.05');
  await expect(page.getByRole('button', { name: 'Paint', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const brushBounds = await page.locator('.preview-surface').boundingBox();
  if (brushBounds === null) throw new Error('The brush surface is unavailable.');
  await page.mouse.move(brushBounds.x + brushBounds.width * 0.35, brushBounds.y + brushBounds.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(brushBounds.x + brushBounds.width * 0.55, brushBounds.y + brushBounds.height * 0.55, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Erase' }).click();
  await expect(page.getByRole('button', { name: 'Erase' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/Enabled · Erase mode/)).toBeVisible();
  await page.mouse.move(brushBounds.x + brushBounds.width * 0.42, brushBounds.y + brushBounds.height * 0.48);
  await page.mouse.down();
  await page.mouse.move(brushBounds.x + brushBounds.width * 0.48, brushBounds.y + brushBounds.height * 0.52, { steps: 3 });
  await page.mouse.up();
  await expect(page.locator('.mask-erase-stroke')).toHaveCount(1);
  await page.getByRole('button', { name: '+ Color range' }).click();
  await expect(page.getByText('Color range mask selected')).toBeVisible();
  await expect(page.getByText(/Enabled · Add source sample mode/)).toBeVisible();
  await page.getByLabel('Color tolerance numeric value').fill('0.15');
  await page.getByLabel('Sample 1 X numeric value').fill('0.3');
  await page.getByLabel('Sample 1 Y numeric value').fill('0.4');
  await page.mouse.click(brushBounds.x + brushBounds.width * 0.75, brushBounds.y + brushBounds.height * 0.25);
  await expect(page.locator('.color-mask-samples > g')).toHaveCount(2);
  await expect(page.getByLabel('Sample 2 X numeric value')).toHaveValue('0.75');
  await expect(page.getByLabel('Sample 2 Y numeric value')).toHaveValue('0.25');
  await page.getByLabel(`Use ${editedRadialTitle} in composition`).check();
  await page.getByLabel(/Use Color range \d+ in composition/).check();
  await page.getByLabel('Mask composition operation').selectOption('subtract');
  await page.getByRole('button', { name: 'Combine 2 masks' }).click();
  await expect(page.getByText('Composite mask selected')).toBeVisible();
  await expect(page.locator('.composite-mask-guides.subtract')).toBeVisible();
  await expect(page.getByLabel('Composite mask children').getByRole('listitem')).toHaveCount(2);
  await expect(page.getByLabel('Selected composite operation')).toHaveValue('subtract');
  await page.getByLabel('Selected composite operation').selectOption('intersect');
  await expect(page.getByLabel('Selected composite operation')).toHaveValue('intersect');
  await page.getByRole('button', { name: 'Create and place points' }).click();
  await expect(page.getByRole('button', { name: /Smart \d+ On/ })).toBeVisible();
  await page.mouse.click(brushBounds.x + brushBounds.width * 0.61, brushBounds.y + brushBounds.height * 0.36);
  await expect.poll(async () => Number(await page.getByLabel('Include point 1 X numeric value').inputValue())).toBeCloseTo(0.61, 2);
  await page.getByLabel('Include point 1 X numeric value').fill('0.58');
  await page.getByRole('button', { name: 'Add editable constraint box' }).click();
  await expect(page.getByLabel('Box 1 X numeric value')).toHaveValue('0.2');
  await page.getByRole('button', { name: 'Add another constraint box' }).click();
  await expect(page.getByLabel('Box 2 X numeric value')).toHaveValue('0.25');
  await page.getByRole('button', { name: 'Remove constraint box 2' }).click();
  await expect(page.getByLabel('Box 2 X numeric value')).not.toBeVisible();
  await expect(page.getByText(new RegExp(webGpuAvailable ? 'WebGPU' : 'WebGL2'))).toBeVisible({ timeout: 15_000 });
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
  await expect(page.getByLabel('Tone ranges from input black to input white')).toContainText('Highlights');
  await page.mouse.move(graphBounds.x + graphBounds.width * 0.35, graphBounds.y + graphBounds.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(graphBounds.x + graphBounds.width * 0.7, graphBounds.y + graphBounds.height * 0.4, { steps: 4 });
  await page.mouse.up();
  await expect(curveGraph.locator('circle')).toHaveCount(3);
  await expect.poll(async () => Number(await page.getByLabel('Curve point X').inputValue())).toBeGreaterThan(0.69);
  const middlePoint = curveGraph.locator('circle').nth(1);
  const pointBounds = await middlePoint.boundingBox();
  if (pointBounds === null) throw new Error('The middle tone-curve point is unavailable.');
  const movedGraphBounds = await curveGraph.boundingBox();
  if (movedGraphBounds === null) throw new Error('The moved tone curve graph is unavailable.');
  await page.mouse.move(pointBounds.x + pointBounds.width / 2, pointBounds.y + pointBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(movedGraphBounds.x + movedGraphBounds.width * 0.55, movedGraphBounds.y + movedGraphBounds.height * 0.4, { steps: 4 });
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
  await page.getByRole('tab', { name: 'History' }).click();
  await page.getByLabel('New preset name').fill('Night master');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: 'Night master' })).toBeVisible();
  await page.getByRole('button', { name: 'Close project and return' }).click();

  await page.getByRole('button', { name: 'Open night' }).hover();
  await page.getByRole('button', { name: 'Rate night 4 stars' }).click();
  await expect(page.getByRole('button', { name: 'Rate night 4 stars' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Open night' }).hover();
  await page.getByRole('button', { name: 'Edit tags' }).click();
  await page.getByLabel('Comma-separated tags').fill('night, client');
  await page.getByRole('button', { name: 'Save tags' }).click();
  await expect(page.getByText('client', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open night' }).hover();
  await page.getByRole('button', { name: 'Add night to favorites' }).click();
  await expect(page.getByRole('button', { name: 'Remove night from favorites' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Search projects').fill('client');
  await expect(page.getByRole('button', { name: 'Open night' })).toBeVisible();
  await page.getByLabel('Favorites only').check();
  await expect(page.getByRole('button', { name: 'Open night' })).toBeVisible();
  await page.getByLabel('Minimum rating').selectOption('5');
  await expect(page.getByText('No matching projects')).toBeVisible();
  await page.getByLabel('Minimum rating').selectOption('4');
  await expect(page.getByRole('button', { name: 'Open night' })).toBeVisible();
  await page.getByRole('button', { name: 'Open night' }).click();
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByRole('button', { name: /Exposure \+0.25/ })).toBeVisible();
  await page.getByRole('tab', { name: 'AI' }).click();
  await expect(page.getByText('Saved AI sessions · 1')).toBeVisible();
  await page.getByText('Saved AI sessions · 1').click();
  const savedCompanionAdvice = page.getByRole('article');
  await expect(savedCompanionAdvice.getByText('Shape a cinematic night portrait while keeping skin believable.')).toBeVisible();
  await expect(savedCompanionAdvice.getByText('applied', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'History' }).click();
  await page.getByRole('button', { name: 'Crop & Geometry', exact: true }).click();
  await expect(page.getByLabel('Rotation numeric value')).toHaveValue('10');
  await expect(page.getByLabel('Vertical perspective numeric value')).toHaveValue('18');
  await expect(page.getByLabel('Horizontal perspective numeric value')).toHaveValue('-12');
  await page.getByRole('tab', { name: 'Masks' }).click();
  await expect(page.getByRole('button', { name: /Composite \d+ On/ })).toBeVisible();
  await page.getByRole('button', { name: /Composite \d+ On/ }).click();
  await expect(page.getByLabel('Selected composite operation')).toHaveValue('intersect');
  await expect(page.getByLabel('Composite mask children').getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Release child masks' }).click();
  await expect(page.getByRole('button', { name: /Radial 1 On/ })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`^${editedRadialTitle} On`) }).click();
  await page.getByText('Local tone curves').click();
  await expect(page.locator('.local-curve-controls .curve-graph circle')).toHaveCount(3);
  await page.getByRole('button', { name: /Brush \d+ On/ }).click();
  await expect(page.getByLabel('Expand / contract numeric value')).toHaveValue('0.05');
  await page.getByRole('button', { name: /Color range \d+ On/ }).click();
  await expect(page.getByLabel('Color tolerance numeric value')).toHaveValue('0.15');
  await expect(page.getByLabel('Sample 2 X numeric value')).toHaveValue('0.75');
  await expect(page.getByRole('button', { name: /Smart \d+ On/ })).toBeVisible();
  await page.keyboard.press('4');
  await page.locator('.curve-graph circle').nth(1).click();
  await expect(page.getByLabel('Curve point Y')).toHaveValue('0.11');
  await page.getByRole('tab', { name: 'History' }).click();
  let customPreset = page.getByRole('article').filter({ hasText: 'Night master' });
  await expect(customPreset).toBeVisible();
  await page.getByRole('button', { name: 'Clear recipe' }).click();
  await expect(page.getByText('No active edits')).toBeVisible();
  await customPreset.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('button', { name: /Exposure \+0.25/ })).toBeVisible();
  await customPreset.getByRole('button', { name: 'Rename' }).click();
  await page.getByLabel('Rename Night master').fill('Night final');
  await page.getByRole('button', { name: 'Done' }).click();
  customPreset = page.getByRole('article').filter({ hasText: 'Night final' });
  const presetDownloadPromise = page.waitForEvent('download');
  await customPreset.getByRole('button', { name: 'Export' }).click();
  const presetDownload = await presetDownloadPromise;
  expect(presetDownload.suggestedFilename()).toBe('Night-final.rawcket-recipe.json');
  const presetPath = await presetDownload.path();
  await customPreset.getByRole('button', { name: 'Delete' }).click();
  await expect(customPreset).toHaveCount(0);
  await page.getByLabel('Select a RAWcket recipe preset').setInputFiles(presetPath);
  await expect(page.getByRole('article').filter({ hasText: 'Night final' })).toBeVisible();
  await page.locator('header').getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByLabel('Format', { exact: true }).selectOption('png');
  await page.getByLabel('Output sharpening').selectOption('high');
  await page.getByLabel('Metadata').selectOption('capture');
  await expect(page.getByText(/Location, editing history, tags, filenames/)).toBeVisible();
  await page.getByLabel('Add text watermark').check();
  await page.getByLabel('Watermark text').fill('RAWcket test');
  await page.getByLabel('Watermark opacity numeric value').fill('63');
  await page.getByLabel('Watermark size numeric value').fill('4.5');
  await page.getByLabel('Watermark position').selectOption('bottom-center');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('night.png');
});

test('imports a photograph by dropping it into the import dialog', async ({ page }) => {
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

  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Import photographs' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Choose photographs' })).toBeEnabled();
  await dialog.locator('.import-dialog-dropzone').dispatchEvent('dragenter', { dataTransfer });
  await dialog.locator('.import-dialog-dropzone').dispatchEvent('drop', { dataTransfer });
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('Project name')).toHaveValue('dropped');
  await dataTransfer.dispose();
});

test('signs in with Google without asking the user for a token or client ID', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.set(window, 'google', { accounts: { oauth2: {
      initTokenClient: (configuration: { callback: (response: { access_token: string; expires_in: number; scope: string }) => void }) => ({
        requestAccessToken: () => configuration.callback({ access_token: 'e2e-google-token', expires_in: 3600, scope: 'drive.file drive.appdata' })
      }),
      revoke: () => undefined
    } } });
  });
  await page.route('https://openidconnect.googleapis.com/v1/userinfo', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: 'photographer@example.com' }) }));
  await page.route('https://www.googleapis.com/drive/v3/files?**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ files: [] }) }));
  await page.goto('/');
  await page.locator('summary[aria-label="Library menu"]').click();
  await page.getByRole('button', { name: 'Sync & Google Drive' }).click();
  const dialog = page.getByRole('dialog', { name: 'Google Drive' });
  await expect(dialog.getByLabel('Google OAuth Web Client ID')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(dialog.getByText(/Google account · photographer@example.com/)).toBeVisible();
  const automaticExports = dialog.getByLabel('Automatically upload future photo exports to Drive');
  await expect(automaticExports).toBeEnabled();
  await automaticExports.check();
  await expect(dialog.getByText(/Future photo exports/)).toBeVisible();
});

test('keeps the preview visible at maximum spatial detail settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open demo' }).click();
  await page.getByRole('tab', { name: 'Edit' }).click();
  await page.getByLabel('Editing tools').getByRole('button', { name: /Detail/ }).click();
  const preview = page.locator('.source-preview');
  await expect(preview).toBeVisible();

  for (const label of ['Texture numeric value', 'Sharpness numeric value', 'Noise Reduction numeric value']) {
    const previousSource = await preview.getAttribute('src');
    await page.getByLabel(label).fill('100');
    await expect.poll(() => preview.getAttribute('src')).not.toBe(previousSource);
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth * image.naturalHeight)).toBeGreaterThan(0);
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const context = canvas.getContext('2d');
      if (context === null) return 0;
      context.drawImage(image, 0, 0, 16, 16);
      const pixels = context.getImageData(0, 0, 16, 16).data;
      let visible = 0;
      for (let index = 0; index < pixels.length; index += 4) visible += (pixels[index + 3] ?? 0) > 0 && ((pixels[index] ?? 0) + (pixels[index + 1] ?? 0) + (pixels[index + 2] ?? 0)) > 3 ? 1 : 0;
      return visible;
    })).toBeGreaterThan(128);
  }
  await expect(page.getByText('Preview up to date')).toBeVisible();
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

  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const importDialog = page.getByRole('dialog', { name: 'Import photographs' });
  await expect(importDialog.getByRole('button', { name: 'Choose photographs' })).toBeEnabled();
  await importDialog.getByRole('button', { name: 'Close import' }).click();
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
  await page.locator('summary[aria-label="Editor menu"]').click();
  await page.getByRole('button', { name: 'Photo information' }).click();
  await expect(page.getByRole('dialog', { name: 'Photo information' })).toContainText('Sony ARW');
  await expect(page.getByRole('dialog', { name: 'Photo information' })).toContainText('6000 × 4000 px');
  await expect(page.getByText(/Embedded 8-bit preview fallback/)).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Photo information' })).toContainText('Final export will not silently use this fallback.');
  await page.getByRole('button', { name: 'Close photo information' }).click();
});
