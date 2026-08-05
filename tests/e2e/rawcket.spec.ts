import { expect, test } from '@playwright/test';

test('importa, edita, guarda, cierra y reabre un proyecto local', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tus imagenes. En tu navegador.' })).toBeVisible();

  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas no disponible en el test.');
    context.fillStyle = '#c9f06b';
    context.fillRect(0, 0, 2, 1);
    return canvas.toDataURL('image/png').split(',')[1] ?? '';
  });
  const png = Buffer.from(pngBase64, 'base64');
  await page.getByLabel('Seleccionar imagen JPEG o PNG').setInputFiles({
    name: 'noche.png',
    mimeType: 'image/png',
    buffer: png
  });

  await expect(page.getByLabel('Nombre del proyecto')).toHaveValue('noche');
  await page.getByRole('button', { name: 'Aumentar Exposicion' }).click();
  await expect(page.getByText('Exposicion 0.25')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar proyecto y volver' }).click();

  await page.getByRole('button', { name: 'Abrir noche' }).click();
  await expect(page.getByText('Exposicion 0.25')).toBeVisible();
});
