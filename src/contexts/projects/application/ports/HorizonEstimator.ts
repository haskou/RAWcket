export type HorizonEstimate = {
  correctionDegrees: number;
  confidence: number;
  supportingEdgeRatio: number;
  reliable: boolean;
};

export type HorizonEstimationOptions = {
  signal: AbortSignal;
};

export interface HorizonEstimator {
  estimate(image: Blob, options: HorizonEstimationOptions): Promise<HorizonEstimate>;
}
