import type { RawDisplayCalibrator } from '../../application/ports/RawDisplayCalibrator';
import { RawDisplayProfile } from '../../domain/RawDisplayProfile';
import type { LibRawImageDecoder } from '../codecs/LibRawImageDecoder';
import type { ImagePixelReader } from './BrowserImagePixelReader';
import type { RawDisplayStatisticsAnalyzer } from './RawDisplayStatisticsAnalyzer';
import type { RawDisplayToneMapper } from './RawDisplayToneMapper';

type CalibrationRawDecoder = Pick<LibRawImageDecoder, 'decode'>;

export class ReferenceRawDisplayCalibrator implements RawDisplayCalibrator {
  private static readonly MAXIMUM_CALIBRATION_EDGE = 2_048;

  public constructor(
    private readonly rawDecoder: CalibrationRawDecoder,
    private readonly referencePixels: ImagePixelReader,
    private readonly statistics: RawDisplayStatisticsAnalyzer,
    private readonly toneMapper: RawDisplayToneMapper
  ) {}

  public async calibrate(raw: Blob, cameraReference: Blob): Promise<RawDisplayProfile> {
    const decoded = await this.rawDecoder.decode(
      await this.readBlob(raw),
      ReferenceRawDisplayCalibrator.MAXIMUM_CALIBRATION_EDGE
    );
    const source = this.statistics.analyzeLinear(decoded.data, this.toneMapper);
    const reference = this.statistics.analyzeBytes(await this.referencePixels.read(cameraReference));
    const toneAndColorProfile = RawDisplayProfile.estimate(source, reference);
    const calibrated = this.statistics.analyzeLinear(decoded.data, this.toneMapper, toneAndColorProfile);
    return toneAndColorProfile.matchChroma(calibrated.meanSaturation, reference.meanSaturation);
  }

  private readBlob(blob: Blob): Promise<ArrayBuffer> {
    if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The RAW calibration source could not be read.'));
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) resolve(reader.result);
        else reject(new Error('The RAW calibration source did not produce binary data.'));
      };
      reader.readAsArrayBuffer(blob);
    });
  }
}
