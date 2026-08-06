import type { RawDisplayProfile } from '../../domain/RawDisplayProfile';

export interface RawDisplayCalibrator {
  calibrate(raw: Blob, cameraReference: Blob): Promise<RawDisplayProfile>;
}
