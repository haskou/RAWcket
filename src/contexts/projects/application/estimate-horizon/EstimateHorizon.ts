import type { HorizonEstimate, HorizonEstimator } from '../ports/HorizonEstimator';
import type { EstimateHorizonMessage } from './messages/EstimateHorizonMessage';

export class EstimateHorizon {
  public constructor(private readonly estimator: HorizonEstimator) {}

  public async estimate(message: EstimateHorizonMessage, signal: AbortSignal): Promise<HorizonEstimate> {
    const result = await this.estimator.estimate(message.getImage(), { signal });
    if (!Number.isFinite(result.correctionDegrees) || result.correctionDegrees < -20 || result.correctionDegrees > 20) {
      throw new Error('The estimated horizon correction is outside the supported range.');
    }
    if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1
      || !Number.isFinite(result.supportingEdgeRatio) || result.supportingEdgeRatio < 0 || result.supportingEdgeRatio > 1) {
      throw new Error('The horizon estimator returned invalid confidence data.');
    }
    return result;
  }
}
