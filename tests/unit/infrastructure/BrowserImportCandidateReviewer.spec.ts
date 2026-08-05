import { BrowserImportCandidateReviewer } from '@/contexts/projects/infrastructure/advisors/BrowserImportCandidateReviewer';

describe('BrowserImportCandidateReviewer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('explains a bounded local preview measurement', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(() => Promise.resolve({ width: 2, height: 1, close })));
    vi.stubGlobal('OffscreenCanvas', class {
      public getContext(): unknown {
        return {
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([30, 30, 30, 255, 220, 220, 220, 255]) }))
        };
      }
    });

    const assessment = await new BrowserImportCandidateReviewer().review(new Blob(['preview']), 6000, 4000);

    expect(assessment.score).toBeGreaterThan(0);
    expect(assessment.score).toBeLessThanOrEqual(100);
    expect(assessment.reasons).toHaveLength(3);
    expect(assessment.reasons[2]).toBe('24.0 MP source resolution.');
    expect(close).toHaveBeenCalledTimes(1);
  });
});
