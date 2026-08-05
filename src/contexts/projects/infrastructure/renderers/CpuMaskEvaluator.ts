import type { MaskDefinitionPrimitives, MaskShape } from '../../domain/MaskDefinition';

type MaskSample = {
  x: number;
  y: number;
  luminance: number;
  positiveLuminances?: number[];
  negativeLuminances?: number[];
};

export class CpuMaskEvaluator {
  public evaluate(mask: MaskDefinitionPrimitives, sample: MaskSample): number {
    if (!mask.enabled) return 0;
    const shapeWeight = this.evaluateShape(mask.shape, sample);
    const feathered = this.feather(shapeWeight, mask.feather);
    const inverted = mask.inverted ? 1 - feathered : feathered;
    return this.clamp(inverted * mask.opacity * mask.density);
  }

  private evaluateShape(shape: MaskShape, sample: MaskSample): number {
    if (shape.kind === 'brush') {
      let weight = 0;
      for (const stroke of shape.strokes) {
        const radius = Math.max(0.000_1, stroke.size / 2);
        for (let index = 0; index < stroke.points.length; index += 1) {
          const point = stroke.points[index];
          if (point === undefined) continue;
          const previous = stroke.points[Math.max(0, index - 1)] ?? point;
          const distance = this.distanceToSegment(sample.x, sample.y, previous.x, previous.y, point.x, point.y);
          const hardRadius = radius * stroke.hardness;
          const strokeWeight = distance <= hardRadius
            ? 1
            : 1 - this.smoothstep(hardRadius, radius, distance);
          weight = Math.max(weight, strokeWeight * stroke.flow);
        }
      }
      return weight;
    }
    if (shape.kind === 'linear-gradient') {
      const axisX = shape.end.x - shape.start.x;
      const axisY = shape.end.y - shape.start.y;
      const lengthSquared = axisX * axisX + axisY * axisY;
      if (lengthSquared <= 0.000_001) return 0;
      return this.clamp(((sample.x - shape.start.x) * axisX + (sample.y - shape.start.y) * axisY) / lengthSquared);
    }
    if (shape.kind === 'radial') {
      const radians = -shape.rotationDegrees * Math.PI / 180;
      const offsetX = sample.x - shape.center.x;
      const offsetY = sample.y - shape.center.y;
      const rotatedX = offsetX * Math.cos(radians) - offsetY * Math.sin(radians);
      const rotatedY = offsetX * Math.sin(radians) + offsetY * Math.cos(radians);
      const distance = Math.sqrt((rotatedX / shape.radiusX) ** 2 + (rotatedY / shape.radiusY) ** 2);
      return 1 - this.smoothstep(0.75, 1, distance);
    }
    if (shape.kind === 'luminance-range') {
      return sample.luminance >= shape.minimum && sample.luminance <= shape.maximum ? 1 : 0;
    }
    if (shape.kind === 'color-range') {
      const nearest = Math.min(...shape.samples.map((point) => Math.hypot(sample.x - point.x, sample.y - point.y)));
      return 1 - this.smoothstep(shape.tolerance * 0.5, shape.tolerance, nearest);
    }
    if (shape.kind === 'ai-segmentation') {
      const insideBox = shape.boundingBoxes.some((box) => sample.x >= box.x && sample.x <= box.x + box.width && sample.y >= box.y && sample.y <= box.y + box.height);
      const positiveDistance = Math.min(...shape.positivePoints.map((point) => Math.hypot(sample.x - point.x, sample.y - point.y)), Number.POSITIVE_INFINITY);
      const negativeDistance = Math.min(...shape.negativePoints.map((point) => Math.hypot(sample.x - point.x, sample.y - point.y)), Number.POSITIVE_INFINITY);
      const positiveLuminanceDistance = Math.min(...(sample.positiveLuminances ?? []).map((value) => Math.abs(sample.luminance - value)), Number.POSITIVE_INFINITY);
      const negativeLuminanceDistance = Math.min(...(sample.negativeLuminances ?? []).map((value) => Math.abs(sample.luminance - value)), Number.POSITIVE_INFINITY);
      const matchesPositive = positiveLuminanceDistance < 0.16 && positiveDistance < 0.45;
      const matchesNegative = negativeLuminanceDistance < 0.1 && negativeDistance < 0.3;
      return (insideBox || matchesPositive) && !matchesNegative ? 1 : 0;
    }
    const childWeights = shape.children.map((child) => this.evaluate(child, sample));
    if (shape.operation === 'add') return Math.max(...childWeights);
    if (shape.operation === 'subtract') return this.clamp((childWeights[0] ?? 0) - Math.max(...childWeights.slice(1)));
    return Math.min(...childWeights);
  }

  private feather(weight: number, feather: number): number {
    if (feather <= 0) return this.clamp(weight);
    const softened = weight * weight * (3 - 2 * weight);
    return weight + (softened - weight) * feather;
  }

  private distanceToSegment(
    x: number,
    y: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): number {
    const axisX = endX - startX;
    const axisY = endY - startY;
    const lengthSquared = axisX * axisX + axisY * axisY;
    if (lengthSquared <= 0.000_001) return Math.hypot(x - startX, y - startY);
    const position = this.clamp(((x - startX) * axisX + (y - startY) * axisY) / lengthSquared);
    return Math.hypot(x - (startX + position * axisX), y - (startY + position * axisY));
  }

  private smoothstep(start: number, end: number, value: number): number {
    if (start === end) return value < start ? 0 : 1;
    const normalized = this.clamp((value - start) / (end - start));
    return normalized * normalized * (3 - 2 * normalized);
  }

  private clamp(value: number): number { return Math.min(1, Math.max(0, value)); }
}
