import { ProjectId } from '../../../domain/value-objects/ProjectId';

export type PhotoExportFormat = 'jpeg' | 'png' | 'tiff';
export type OutputSharpening = 'none' | 'low' | 'standard' | 'high';
export type WatermarkPosition = 'bottom-left' | 'bottom-center' | 'bottom-right';
export type PhotoWatermark = {
  text: string;
  opacity: number;
  sizePercent: number;
  position: WatermarkPosition;
};

export class ExportProjectPhotoMessage {
  private readonly projectId: ProjectId;

  public constructor(
    projectId: string,
    private readonly format: PhotoExportFormat,
    private readonly quality: number,
    private readonly maximumEdge: number | null,
    private readonly outputSharpening: OutputSharpening = 'none',
    watermark: PhotoWatermark | null = null
  ) {
    this.projectId = new ProjectId(projectId);
    if (!Number.isFinite(quality) || quality < 0.1 || quality > 1) {
      throw new Error('Export quality must be between 0.1 and 1.');
    }
    if (maximumEdge !== null && (!Number.isSafeInteger(maximumEdge) || maximumEdge < 256 || maximumEdge > 16_384)) {
      throw new Error('The export edge must be between 256 and 16384 pixels.');
    }
    if (!['none', 'low', 'standard', 'high'].includes(outputSharpening)) throw new Error('Output sharpening is not supported.');
    this.watermark = watermark === null ? null : this.validateWatermark(watermark);
  }

  private readonly watermark: PhotoWatermark | null;

  public getProjectId(): ProjectId { return this.projectId; }
  public getFormat(): PhotoExportFormat { return this.format; }
  public getMimeType(): 'image/jpeg' | 'image/png' | 'image/tiff' {
    if (this.format === 'jpeg') return 'image/jpeg';
    return this.format === 'png' ? 'image/png' : 'image/tiff';
  }
  public getQuality(): number { return this.quality; }
  public getMaximumEdge(): number | null { return this.maximumEdge; }
  public getOutputSharpening(): OutputSharpening { return this.outputSharpening; }
  public getWatermark(): PhotoWatermark | null { return this.watermark === null ? null : { ...this.watermark }; }

  private validateWatermark(watermark: PhotoWatermark): PhotoWatermark {
    const text = watermark.text.trim();
    if (text.length < 1 || text.length > 120) throw new Error('Watermark text must contain between 1 and 120 characters.');
    if (!Number.isFinite(watermark.opacity) || watermark.opacity < 0.1 || watermark.opacity > 1) throw new Error('Watermark opacity must be between 0.1 and 1.');
    if (!Number.isFinite(watermark.sizePercent) || watermark.sizePercent < 1 || watermark.sizePercent > 10) throw new Error('Watermark size must be between 1% and 10%.');
    if (!['bottom-left', 'bottom-center', 'bottom-right'].includes(watermark.position)) throw new Error('Watermark position is not supported.');
    return { text, opacity: watermark.opacity, sizePercent: watermark.sizePercent, position: watermark.position };
  }
}
