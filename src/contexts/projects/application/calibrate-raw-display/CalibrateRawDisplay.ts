import type { RawDisplayProfilePrimitives } from '../../domain/RawDisplayProfile';
import type { RawDisplayCalibrator } from '../ports/RawDisplayCalibrator';
import type { CalibrateRawDisplayMessage } from './messages/CalibrateRawDisplayMessage';

export class CalibrateRawDisplay {
  public constructor(private readonly calibrator: RawDisplayCalibrator) {}

  public async calibrate(message: CalibrateRawDisplayMessage): Promise<RawDisplayProfilePrimitives> {
    return (await this.calibrator.calibrate(message.getRaw(), message.getCameraReference())).toPrimitives();
  }
}
