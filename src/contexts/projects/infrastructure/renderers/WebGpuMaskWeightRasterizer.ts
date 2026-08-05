import type { MaskDefinitionPrimitives } from '../../domain/MaskDefinition';
import { GpuMaskProgramEncoder } from './GpuMaskProgram';

export type WebGpuMaskWeightRasterization = {
  weights: GPUBuffer;
  resources: GPUBuffer[];
};

export class WebGpuMaskWeightRasterizer {
  private readonly programEncoder = new GpuMaskProgramEncoder();

  public rasterize(
    device: GPUDevice,
    commandEncoder: GPUCommandEncoder,
    source: GPUBuffer,
    width: number,
    height: number,
    masks: MaskDefinitionPrimitives[]
  ): WebGpuMaskWeightRasterization | null {
    const resources: GPUBuffer[] = [];
    const minimumBufferSize = Float32Array.BYTES_PER_ELEMENT;
    if (masks.length === 0) {
      const weights = this.buffer(device, minimumBufferSize, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
      return { weights, resources: [weights] };
    }
    const program = this.programEncoder.encode(masks);
    if (program === null) return null;
    const weightBytes = width * height * masks.length * Float32Array.BYTES_PER_ELEMENT;
    if ([program.nodes.byteLength, program.data.byteLength, program.outputs.byteLength, weightBytes]
      .some((size) => size > device.limits.maxStorageBufferBindingSize)) return null;

    try {
      const weights = this.buffer(device, weightBytes, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
      resources.push(weights);
      const nodes = this.buffer(device, program.nodes.byteLength, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
      resources.push(nodes);
      const data = this.buffer(device, program.data.byteLength, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
      resources.push(data);
      const outputs = this.buffer(device, program.outputs.byteLength, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
      resources.push(outputs);
      const parameters = this.parameters(width, height, program.nodeCount, masks.length);
      const parameterBuffer = this.buffer(device, parameters.byteLength, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
      resources.push(parameterBuffer);
      device.queue.writeBuffer(nodes, 0, program.nodes);
      device.queue.writeBuffer(data, 0, program.data);
      device.queue.writeBuffer(outputs, 0, program.outputs);
      device.queue.writeBuffer(parameterBuffer, 0, parameters);

      const module = device.createShaderModule({ label: 'RAWcket vector mask rasterizer', code: maskComputeShader });
      const pipeline = device.createComputePipeline({
        label: 'RAWcket vector mask rasterization pipeline',
        layout: 'auto',
        compute: { module, entryPoint: 'rasterize' }
      });
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: source } },
          { binding: 1, resource: { buffer: weights } },
          { binding: 2, resource: { buffer: parameterBuffer } },
          { binding: 3, resource: { buffer: nodes } },
          { binding: 4, resource: { buffer: data } },
          { binding: 5, resource: { buffer: outputs } }
        ]
      });
      const pass = commandEncoder.beginComputePass({ label: 'RAWcket vector mask rasterization pass' });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16));
      pass.end();
      return { weights, resources };
    } catch {
      resources.forEach((resource) => resource.destroy());
      return null;
    }
  }

  private parameters(width: number, height: number, nodeCount: number, maskCount: number): Uint32Array<ArrayBuffer> {
    const values = new Uint32Array(new ArrayBuffer(4 * Uint32Array.BYTES_PER_ELEMENT));
    values.set([width, height, nodeCount, maskCount]);
    return values;
  }

  private buffer(device: GPUDevice, size: number, usage: GPUBufferUsageFlags): GPUBuffer {
    return device.createBuffer({ size, usage });
  }
}

const maskComputeShader = `
struct MaskParameters {
  dimensions: vec2u,
  nodeCount: u32,
  maskCount: u32,
}

@group(0) @binding(0) var<storage, read> source: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;
@group(0) @binding(2) var<uniform> parameters: MaskParameters;
@group(0) @binding(3) var<storage, read> nodes: array<vec4f>;
@group(0) @binding(4) var<storage, read> data: array<vec4f>;
@group(0) @binding(5) var<storage, read> outputs: array<u32>;

fn unpack(value: u32) -> vec4f {
  return vec4f(
    f32(value & 255u),
    f32((value >> 8u) & 255u),
    f32((value >> 16u) & 255u),
    f32((value >> 24u) & 255u)
  ) / 255.0;
}
fn luminance(rgb: vec3f) -> f32 { return dot(rgb, vec3f(0.2126, 0.7152, 0.0722)); }
fn sourceLuminance(point: vec2f) -> f32 {
  let coordinate = min(parameters.dimensions - vec2u(1u), vec2u(floor(clamp(point, vec2f(0.0), vec2f(1.0)) * vec2f(parameters.dimensions))));
  return luminance(unpack(source[coordinate.y * parameters.dimensions.x + coordinate.x]).rgb);
}
fn distanceToSegment(point: vec2f, start: vec2f, end: vec2f) -> f32 {
  let axis = end - start;
  let lengthSquared = dot(axis, axis);
  if (lengthSquared <= 0.000001) { return distance(point, start); }
  let position = clamp(dot(point - start, axis) / lengthSquared, 0.0, 1.0);
  return distance(point, start + position * axis);
}
fn primitiveWeight(kind: u32, header: vec4f, first: vec4f, second: vec4f, point: vec2f, light: f32) -> f32 {
  let offset = u32(header.y);
  let count = u32(header.z);
  if (kind == 1u) {
    var weight = 0.0;
    for (var segment = 0u; segment < count; segment += 1u) {
      let coordinates = data[offset + segment * 2u];
      let properties = data[offset + segment * 2u + 1u];
      let pressure = abs(properties.w);
      let radius = max(0.0001, properties.x * max(0.15, pressure) / 2.0 + first.x);
      let hardRadius = radius * properties.y;
      let segmentDistance = distanceToSegment(point, coordinates.xy, coordinates.zw);
      let strokeWeight = select(1.0 - smoothstep(hardRadius, radius, segmentDistance), 1.0, segmentDistance <= hardRadius);
      let contribution = strokeWeight * properties.z * max(0.15, pressure);
      weight = select(max(weight, contribution), clamp(weight - contribution, 0.0, 1.0), properties.w < 0.0);
    }
    return weight;
  }
  if (kind == 2u) {
    let axis = first.zw - first.xy;
    let lengthSquared = dot(axis, axis);
    return select(clamp(dot(point - first.xy, axis) / lengthSquared + second.x, 0.0, 1.0), 0.0, lengthSquared <= 0.000001);
  }
  if (kind == 3u) {
    let cosine = cos(second.x);
    let sine = sin(second.x);
    let delta = point - first.xy;
    let rotated = vec2f(delta.x * cosine - delta.y * sine, delta.x * sine + delta.y * cosine);
    let radii = max(vec2f(0.001), first.zw + vec2f(second.y));
    return 1.0 - smoothstep(0.75, 1.0, length(rotated / radii));
  }
  if (kind == 4u) { return select(0.0, 1.0, light >= first.x - first.z && light <= first.y + first.z); }
  if (kind == 5u) {
    var nearest = 1.414214;
    for (var item = 0u; item < count; item += 1u) { nearest = min(nearest, distance(point, data[offset + item].xy)); }
    let tolerance = max(0.001, first.x + first.y);
    return 1.0 - smoothstep(tolerance * 0.5, tolerance, nearest);
  }
  var insideBox = false;
  var positiveDistance = 1.414214;
  var negativeDistance = 1.414214;
  var positiveLightDistance = 2.0;
  var negativeLightDistance = 2.0;
  for (var item = 0u; item < count; item += 1u) {
    let definition = data[offset + item];
    let itemKind = u32(definition.x);
    if (itemKind == 1u || itemKind == 2u) {
      let pointDistance = distance(point, definition.yz);
      let lightDistance = abs(light - sourceLuminance(definition.yz));
      if (itemKind == 1u) {
        positiveDistance = min(positiveDistance, pointDistance);
        positiveLightDistance = min(positiveLightDistance, lightDistance);
      } else {
        negativeDistance = min(negativeDistance, pointDistance);
        negativeLightDistance = min(negativeLightDistance, lightDistance);
      }
    }
    if (itemKind == 3u && item + 1u < count) {
      let height = data[offset + item + 1u].y;
      insideBox = insideBox || (point.x >= definition.y - first.x && point.x <= definition.y + definition.w + first.x
        && point.y >= definition.z - first.x && point.y <= definition.z + height + first.x);
    }
  }
  let matchesPositive = positiveLightDistance < 0.16 + first.x && positiveDistance < 0.45 + first.x;
  let matchesNegative = negativeLightDistance < 0.1 && negativeDistance < max(0.01, 0.3 - first.x);
  return select(0.0, 1.0, (insideBox || matchesPositive) && !matchesNegative);
}

@compute @workgroup_size(16, 16)
fn rasterize(@builtin(global_invocation_id) invocation: vec3u) {
  if (invocation.x >= parameters.dimensions.x || invocation.y >= parameters.dimensions.y) { return; }
  let index = invocation.y * parameters.dimensions.x + invocation.x;
  let pixelCount = parameters.dimensions.x * parameters.dimensions.y;
  let point = (vec2f(invocation.xy) + vec2f(0.5)) / vec2f(parameters.dimensions);
  let light = luminance(unpack(source[index]).rgb);
  var weights: array<f32, 256>;
  for (var node = 0u; node < parameters.nodeCount; node += 1u) {
    let header = nodes[node * 3u];
    let first = nodes[node * 3u + 1u];
    let second = nodes[node * 3u + 2u];
    let kind = u32(header.x);
    if (kind <= 6u) {
      weights[node] = primitiveWeight(kind, header, first, second, point, light);
    } else if (kind <= 9u) {
      let offset = u32(header.y);
      let count = u32(header.z);
      var combined = select(1.0, 0.0, kind == 7u);
      if (kind == 8u) {
        combined = weights[u32(data[offset].x)];
        var removal = 0.0;
        for (var child = 1u; child < count; child += 1u) { removal = max(removal, weights[u32(data[offset + child].x)]); }
        combined = clamp(combined - removal, 0.0, 1.0);
      } else {
        for (var child = 0u; child < count; child += 1u) {
          let value = weights[u32(data[offset + child].x)];
          combined = select(min(combined, value), max(combined, value), kind == 7u);
        }
      }
      weights[node] = combined;
    } else {
      var value = weights[u32(header.w)];
      let softened = value * value * (3.0 - 2.0 * value);
      value = mix(value, softened, first.w);
      value = select(value, 1.0 - value, first.y > 0.5);
      weights[node] = select(0.0, clamp(value * first.z * second.x, 0.0, 1.0), first.x > 0.5);
    }
  }
  for (var mask = 0u; mask < parameters.maskCount; mask += 1u) {
    output[mask * pixelCount + index] = weights[outputs[mask]];
  }
}`;
