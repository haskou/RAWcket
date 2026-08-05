import type { MaskDefinitionPrimitives, MaskShape } from '../../domain/MaskDefinition';

export const GPU_MASK_MAXIMUM_NODES = 256;
export const GPU_MASK_MAXIMUM_DATA_ITEMS = 4096;
export const GPU_MASK_NODE_TEXELS = 3;

export const GPU_MASK_NODE = {
  BRUSH: 1,
  LINEAR_GRADIENT: 2,
  RADIAL: 3,
  LUMINANCE_RANGE: 4,
  COLOR_RANGE: 5,
  AI_SEGMENTATION: 6,
  COMPOSITE_ADD: 7,
  COMPOSITE_SUBTRACT: 8,
  COMPOSITE_INTERSECT: 9,
  APPLY_MASK: 10
} as const;

export type GpuMaskProgram = {
  nodes: Float32Array<ArrayBuffer>;
  data: Float32Array<ArrayBuffer>;
  outputs: Uint32Array<ArrayBuffer>;
  nodeCount: number;
  dataItemCount: number;
};

type NodeParameters = {
  kind: number;
  dataOffset?: number;
  dataCount?: number;
  reference?: number;
  first?: readonly [number, number, number, number];
  second?: readonly [number, number, number, number];
};

export class GpuMaskProgramEncoder {
  private readonly nodes: number[] = [];
  private readonly data: number[] = [];

  public encode(masks: MaskDefinitionPrimitives[]): GpuMaskProgram | null {
    this.nodes.length = 0;
    this.data.length = 0;
    const outputs = masks.map((mask) => this.encodeMask(mask));
    const nodeCount = this.nodes.length / (GPU_MASK_NODE_TEXELS * 4);
    const dataItemCount = this.data.length / 4;
    if (nodeCount > GPU_MASK_MAXIMUM_NODES || dataItemCount > GPU_MASK_MAXIMUM_DATA_ITEMS) return null;
    return {
      nodes: this.floatBuffer(this.nodes.length === 0 ? [0, 0, 0, 0] : this.nodes),
      data: this.floatBuffer(this.data.length === 0 ? [0, 0, 0, 0] : this.data),
      outputs: this.uintBuffer(outputs.length === 0 ? [0] : outputs),
      nodeCount,
      dataItemCount
    };
  }

  private encodeMask(mask: MaskDefinitionPrimitives): number {
    const shape = this.encodeShape(mask.shape, mask.expansion ?? 0);
    return this.addNode({
      kind: GPU_MASK_NODE.APPLY_MASK,
      reference: shape,
      first: [mask.enabled ? 1 : 0, mask.inverted ? 1 : 0, mask.opacity, mask.feather],
      second: [mask.density, 0, 0, 0]
    });
  }

  private encodeShape(shape: MaskShape, expansion: number): number {
    if (shape.kind === 'brush') return this.encodeBrush(shape, expansion);
    if (shape.kind === 'linear-gradient') {
      return this.addNode({
        kind: GPU_MASK_NODE.LINEAR_GRADIENT,
        first: [shape.start.x, shape.start.y, shape.end.x, shape.end.y],
        second: [expansion, 0, 0, 0]
      });
    }
    if (shape.kind === 'radial') {
      return this.addNode({
        kind: GPU_MASK_NODE.RADIAL,
        first: [shape.center.x, shape.center.y, shape.radiusX, shape.radiusY],
        second: [-shape.rotationDegrees * Math.PI / 180, expansion, 0, 0]
      });
    }
    if (shape.kind === 'luminance-range') {
      return this.addNode({
        kind: GPU_MASK_NODE.LUMINANCE_RANGE,
        first: [shape.minimum, shape.maximum, expansion, 0]
      });
    }
    if (shape.kind === 'color-range') {
      const offset = this.dataItemCount();
      shape.samples.forEach((point) => this.addData(point.x, point.y, 0, 0));
      return this.addNode({
        kind: GPU_MASK_NODE.COLOR_RANGE,
        dataOffset: offset,
        dataCount: shape.samples.length,
        first: [shape.tolerance, expansion, 0, 0]
      });
    }
    if (shape.kind === 'ai-segmentation') return this.encodeAiSegmentation(shape, expansion);
    const children = shape.children.map((child) => this.encodeMask(child));
    const offset = this.dataItemCount();
    children.forEach((child) => this.addData(child, 0, 0, 0));
    return this.addNode({
      kind: shape.operation === 'add'
        ? GPU_MASK_NODE.COMPOSITE_ADD
        : shape.operation === 'subtract'
          ? GPU_MASK_NODE.COMPOSITE_SUBTRACT
          : GPU_MASK_NODE.COMPOSITE_INTERSECT,
      dataOffset: offset,
      dataCount: children.length
    });
  }

  private encodeBrush(shape: Extract<MaskShape, { kind: 'brush' }>, expansion: number): number {
    const offset = this.dataItemCount();
    let segments = 0;
    shape.strokes.forEach((stroke) => {
      stroke.points.forEach((point, index) => {
        const previous = stroke.points[Math.max(0, index - 1)] ?? point;
        const pressure = ((previous.pressure ?? 1) + (point.pressure ?? 1)) / 2;
        this.addData(previous.x, previous.y, point.x, point.y);
        this.addData(stroke.size, stroke.hardness, stroke.flow, stroke.mode === 'erase' ? -Math.max(Number.EPSILON, pressure) : pressure);
        segments += 1;
      });
    });
    return this.addNode({
      kind: GPU_MASK_NODE.BRUSH,
      dataOffset: offset,
      dataCount: segments,
      first: [expansion, 0, 0, 0]
    });
  }

  private encodeAiSegmentation(shape: Extract<MaskShape, { kind: 'ai-segmentation' }>, expansion: number): number {
    const offset = this.dataItemCount();
    shape.positivePoints.forEach((point) => this.addData(1, point.x, point.y, 0));
    shape.negativePoints.forEach((point) => this.addData(2, point.x, point.y, 0));
    shape.boundingBoxes.forEach((box) => {
      this.addData(3, box.x, box.y, box.width);
      this.addData(4, box.height, 0, 0);
    });
    return this.addNode({
      kind: GPU_MASK_NODE.AI_SEGMENTATION,
      dataOffset: offset,
      dataCount: this.dataItemCount() - offset,
      first: [expansion, 0, 0, 0]
    });
  }

  private addNode(parameters: NodeParameters): number {
    const index = this.nodes.length / (GPU_MASK_NODE_TEXELS * 4);
    this.nodes.push(
      parameters.kind,
      parameters.dataOffset ?? 0,
      parameters.dataCount ?? 0,
      parameters.reference ?? 0,
      ...(parameters.first ?? [0, 0, 0, 0]),
      ...(parameters.second ?? [0, 0, 0, 0])
    );
    return index;
  }

  private addData(first: number, second: number, third: number, fourth: number): void {
    this.data.push(first, second, third, fourth);
  }

  private dataItemCount(): number {
    return this.data.length / 4;
  }

  private floatBuffer(values: number[]): Float32Array<ArrayBuffer> {
    const output = new Float32Array(new ArrayBuffer(values.length * Float32Array.BYTES_PER_ELEMENT));
    output.set(values);
    return output;
  }

  private uintBuffer(values: number[]): Uint32Array<ArrayBuffer> {
    const output = new Uint32Array(new ArrayBuffer(values.length * Uint32Array.BYTES_PER_ELEMENT));
    output.set(values);
    return output;
  }
}
