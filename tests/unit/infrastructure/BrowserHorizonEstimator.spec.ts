import { BrowserHorizonEstimator, type HorizonEstimatorRuntime } from '@/contexts/projects/infrastructure/analysis/BrowserHorizonEstimator';

function slopedEdge(width: number, height: number, degrees: number): Uint8ClampedArray<ArrayBuffer> {
  const pixels = new Uint8ClampedArray(new ArrayBuffer(width * height * 4));
  const slope = Math.tan(degrees * Math.PI / 180);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edgeY = height / 2 + (x - width / 2) * slope;
      const blend = Math.min(1, Math.max(0, (y - edgeY + 1.5) / 3));
      const value = Math.round(20 + blend * 210);
      const index = (y * width + x) * 4;
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  }
  return pixels;
}

function runtime(width: number, height: number, data: Uint8ClampedArray): HorizonEstimatorRuntime {
  return { read: vi.fn().mockResolvedValue({ width, height, data }) };
}

describe('BrowserHorizonEstimator', () => {
  it('returns the inverse of a strong sloped horizon using only local pixels', async () => {
    const width = 120;
    const height = 80;
    const estimator = new BrowserHorizonEstimator(runtime(width, height, slopedEdge(width, height, 6)));

    const estimate = await estimator.estimate(new Blob(['preview'], { type: 'image/jpeg' }), { signal: new AbortController().signal });

    expect(estimate.reliable).toBe(true);
    expect(estimate.correctionDegrees).toBeCloseTo(-6, 0);
    expect(estimate.confidence).toBeGreaterThan(0.5);
    expect(estimate.supportingEdgeRatio).toBeGreaterThan(0.9);
  });

  it('does not fabricate a correction when no strong edge exists', async () => {
    const width = 16;
    const height = 12;
    const estimator = new BrowserHorizonEstimator(runtime(width, height, new Uint8ClampedArray(width * height * 4)));

    await expect(estimator.estimate(
      new Blob(['preview'], { type: 'image/png' }),
      { signal: new AbortController().signal }
    )).resolves.toEqual({ correctionDegrees: 0, confidence: 0, supportingEdgeRatio: 0, reliable: false });
  });

  it('honors cancellation before analyzing pixels', async () => {
    const controller = new AbortController();
    controller.abort();
    const estimator = new BrowserHorizonEstimator(runtime(3, 3, new Uint8ClampedArray(36)));

    await expect(estimator.estimate(new Blob(['preview'], { type: 'image/png' }), { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});
