import type { ImportCandidateAssessment, ImportCandidateReviewer } from '../../application/ports/ImportCandidateReviewer';

export class BrowserImportCandidateReviewer implements ImportCandidateReviewer {
  public async review(preview: Blob, width: number, height: number): Promise<ImportCandidateAssessment> {
    const bitmap = await createImageBitmap(preview);
    const sampleWidth = Math.min(96, bitmap.width);
    const sampleHeight = Math.max(1, Math.round(sampleWidth * bitmap.height / bitmap.width));
    const canvas = new OffscreenCanvas(sampleWidth, sampleHeight);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null) throw new Error('This browser cannot analyze import candidates locally.');
    context.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);
    bitmap.close();
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const luminance: number[] = [];
    let clipped = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const value = ((pixels[index] ?? 0) * 0.2126 + (pixels[index + 1] ?? 0) * 0.7152 + (pixels[index + 2] ?? 0) * 0.0722) / 255;
      luminance.push(value);
      if (value < 0.02 || value > 0.98) clipped += 1;
    }
    const mean = luminance.reduce((total, value) => total + value, 0) / luminance.length;
    const variance = luminance.reduce((total, value) => total + (value - mean) ** 2, 0) / luminance.length;
    let edgeEnergy = 0;
    for (let y = 1; y < sampleHeight; y += 1) for (let x = 1; x < sampleWidth; x += 1) {
      const index = y * sampleWidth + x;
      edgeEnergy += Math.abs((luminance[index] ?? 0) - (luminance[index - 1] ?? 0));
      edgeEnergy += Math.abs((luminance[index] ?? 0) - (luminance[index - sampleWidth] ?? 0));
    }
    const detail = edgeEnergy / Math.max(1, (sampleWidth - 1) * (sampleHeight - 1) * 2);
    const clippingRatio = clipped / luminance.length;
    const megapixels = width * height / 1_000_000;
    const score = Math.round(Math.min(100, Math.max(0,
      46 + Math.min(20, detail * 180) + Math.min(14, variance * 180) + Math.min(10, Math.log2(megapixels + 1) * 2.5) - clippingRatio * 70 - Math.abs(mean - 0.5) * 20
    )));
    const reasons = [
      clippingRatio < 0.03 ? 'Highlights and shadows are well contained.' : `${Math.round(clippingRatio * 100)}% of the sample is near clipping.`,
      detail > 0.08 ? 'Strong local edge detail in the preview.' : detail > 0.035 ? 'Moderate local detail; check focus at 100%.' : 'Low measured edge detail; verify focus or motion.',
      `${megapixels.toFixed(1)} MP source resolution.`
    ];
    return { score, reasons };
  }
}
