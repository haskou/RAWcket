import type { PhotoWatermark } from '../../application/export-project-photo/messages/ExportProjectPhotoMessage';

export class CanvasWatermarkRenderer {
  public render(context: OffscreenCanvasRenderingContext2D, width: number, height: number, watermark: PhotoWatermark): void {
    const fontSize = Math.max(10, Math.round(Math.min(width, height) * watermark.sizePercent / 100));
    const padding = Math.max(8, Math.round(fontSize * 0.8));
    context.save();
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    context.textBaseline = 'bottom';
    context.textAlign = watermark.position === 'bottom-left' ? 'left' : watermark.position === 'bottom-center' ? 'center' : 'right';
    context.globalAlpha = watermark.opacity;
    context.fillStyle = '#ffffff';
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = Math.max(2, Math.round(fontSize * 0.12));
    context.shadowOffsetY = Math.max(1, Math.round(fontSize * 0.06));
    const x = watermark.position === 'bottom-left' ? padding : watermark.position === 'bottom-center' ? width / 2 : width - padding;
    context.fillText(watermark.text, x, height - padding, Math.max(1, width - padding * 2));
    context.restore();
  }
}
