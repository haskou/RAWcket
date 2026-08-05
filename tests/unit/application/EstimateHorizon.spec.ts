import { EstimateHorizon } from '@/contexts/projects/application/estimate-horizon/EstimateHorizon';
import { EstimateHorizonMessage } from '@/contexts/projects/application/estimate-horizon/messages/EstimateHorizonMessage';
import type { HorizonEstimator } from '@/contexts/projects/application/ports/HorizonEstimator';

describe('EstimateHorizon', () => {
  it('returns a bounded local estimate from the configured analysis port', async () => {
    const result = { correctionDegrees: -4.2, confidence: 0.72, supportingEdgeRatio: 0.4, reliable: true };
    const estimate = vi.fn<HorizonEstimator['estimate']>().mockResolvedValue(result);
    const signal = new AbortController().signal;

    await expect(new EstimateHorizon({ estimate }).estimate(
      new EstimateHorizonMessage(new Blob(['pixels'], { type: 'image/jpeg' })),
      signal
    )).resolves.toEqual(result);
    expect(estimate).toHaveBeenCalledWith(expect.any(Blob), { signal });
  });

  it('rejects an out-of-contract correction before presentation can apply it', async () => {
    const estimate = vi.fn<HorizonEstimator['estimate']>().mockResolvedValue({
      correctionDegrees: 45,
      confidence: 0.9,
      supportingEdgeRatio: 0.8,
      reliable: true
    });

    await expect(new EstimateHorizon({ estimate }).estimate(
      new EstimateHorizonMessage(new Blob(['pixels'])),
      new AbortController().signal
    )).rejects.toThrow('outside the supported range');
  });
});
