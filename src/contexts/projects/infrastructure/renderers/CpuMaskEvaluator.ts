import type { MaskDefinitionPrimitives, MaskShape } from '../../domain/MaskDefinition';

type MaskSample = {
  x: number;
  y: number;
  luminance: number;
  color?: readonly [number, number, number];
  sourceColorAt?: (point: { x: number; y: number }) => readonly [number, number, number];
  sourceLuminanceAt?: (point: { x: number; y: number }) => number;
};

export class CpuMaskEvaluator {
  public evaluate(mask: MaskDefinitionPrimitives, sample: MaskSample): number {
    if (!mask.enabled) return 0;
    const shapeWeight = this.evaluateShape(mask.shape, sample, mask.expansion ?? 0);
    const feathered = this.feather(shapeWeight, mask.feather);
    const inverted = mask.inverted ? 1 - feathered : feathered;
    return this.clamp(inverted * mask.opacity * mask.density);
  }

  private evaluateShape(shape: MaskShape, sample: MaskSample, expansion: number): number {
    if (shape.kind === 'brush') {
      let weight = 0;
      for (const stroke of shape.strokes) {
        for (let index = 0; index < stroke.points.length; index += 1) {
          const point = stroke.points[index];
          if (point === undefined) continue;
          const previous = stroke.points[Math.max(0, index - 1)] ?? point;
          const pressure = ((previous.pressure ?? 1) + (point.pressure ?? 1)) / 2;
          const radius = Math.max(0.000_1, stroke.size * Math.max(0.15, pressure) / 2 + expansion);
          const distance = this.distanceToSegment(sample.x, sample.y, previous.x, previous.y, point.x, point.y);
          const hardRadius = radius * stroke.hardness;
          const strokeWeight = distance <= hardRadius
            ? 1
            : 1 - this.smoothstep(hardRadius, radius, distance);
          const contribution = strokeWeight * stroke.flow * Math.max(0.15, pressure);
          weight = stroke.mode === 'erase' ? this.clamp(weight - contribution) : Math.max(weight, contribution);
        }
      }
      return weight;
    }
    if (shape.kind === 'linear-gradient') {
      const axisX = shape.end.x - shape.start.x;
      const axisY = shape.end.y - shape.start.y;
      const lengthSquared = axisX * axisX + axisY * axisY;
      if (lengthSquared <= 0.000_001) return 0;
      return this.clamp(((sample.x - shape.start.x) * axisX + (sample.y - shape.start.y) * axisY) / lengthSquared + expansion);
    }
    if (shape.kind === 'radial') {
      const radians = -shape.rotationDegrees * Math.PI / 180;
      const offsetX = sample.x - shape.center.x;
      const offsetY = sample.y - shape.center.y;
      const rotatedX = offsetX * Math.cos(radians) - offsetY * Math.sin(radians);
      const rotatedY = offsetX * Math.sin(radians) + offsetY * Math.cos(radians);
      const distance = Math.sqrt((rotatedX / Math.max(0.001, shape.radiusX + expansion)) ** 2 + (rotatedY / Math.max(0.001, shape.radiusY + expansion)) ** 2);
      return 1 - this.smoothstep(0.75, 1, distance);
    }
    if (shape.kind === 'luminance-range') {
      return sample.luminance >= shape.minimum - expansion && sample.luminance <= shape.maximum + expansion ? 1 : 0;
    }
    if (shape.kind === 'color-range') {
      if (sample.color === undefined || sample.sourceColorAt === undefined) return 0;
      const color = sample.color;
      const sourceColorAt = sample.sourceColorAt;
      const nearest = Math.min(...shape.samples.map((point) => this.colorDistance(color, sourceColorAt(point))));
      const tolerance = Math.max(0.001, shape.tolerance + expansion);
      return 1 - this.smoothstep(tolerance * 0.5, tolerance, nearest);
    }
    if (shape.kind === 'ai-segmentation') {
      const insideBox = shape.boundingBoxes.some((box) => sample.x >= box.x - expansion && sample.x <= box.x + box.width + expansion && sample.y >= box.y - expansion && sample.y <= box.y + box.height + expansion);
      const positiveDistance = Math.min(...shape.positivePoints.map((point) => Math.hypot(sample.x - point.x, sample.y - point.y)), Number.POSITIVE_INFINITY);
      const negativeDistance = Math.min(...shape.negativePoints.map((point) => Math.hypot(sample.x - point.x, sample.y - point.y)), Number.POSITIVE_INFINITY);
      const positiveLuminanceDistance = Math.min(...shape.positivePoints.map((point) => Math.abs(sample.luminance - (sample.sourceLuminanceAt?.(point) ?? Number.POSITIVE_INFINITY))), Number.POSITIVE_INFINITY);
      const negativeLuminanceDistance = Math.min(...shape.negativePoints.map((point) => Math.abs(sample.luminance - (sample.sourceLuminanceAt?.(point) ?? Number.POSITIVE_INFINITY))), Number.POSITIVE_INFINITY);
      const matchesPositive = positiveLuminanceDistance < 0.16 + expansion && positiveDistance < 0.45 + expansion;
      const matchesNegative = negativeLuminanceDistance < 0.1 && negativeDistance < Math.max(0.01, 0.3 - expansion);
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

  private colorDistance(first: readonly [number, number, number], second: readonly [number, number, number]): number {
    return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]) / Math.sqrt(3);
  }

  private clamp(value: number): number { return Math.min(1, Math.max(0, value)); }
}
