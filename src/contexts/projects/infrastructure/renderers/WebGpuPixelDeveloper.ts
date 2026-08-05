import type { GlobalAdjustmentsPrimitives } from '../../domain/GlobalAdjustments';
import type { CpuDevelopmentSettings } from './CpuPixelDeveloper';
import { ToneCurveLut } from './ToneCurveLut';
import { WebGpuMaskWeightRasterizer } from './WebGpuMaskWeightRasterizer';

const adjustmentOrder = [
  'exposure', 'temperature', 'tint', 'contrast', 'highlights', 'shadows', 'whites', 'blacks',
  'saturation', 'vibrance', 'clarity', 'texture', 'dehaze', 'sharpness', 'noiseReduction', 'vignette'
] as const;
const maximumGpuMasks = 32;

export class WebGpuPixelDeveloper {
  private readonly maskRasterizer = new WebGpuMaskWeightRasterizer();

  public async develop(
    source: Uint8ClampedArray,
    width: number,
    height: number,
    settings: CpuDevelopmentSettings
  ): Promise<Uint8ClampedArray<ArrayBuffer> | null> {
    if (!this.canDevelop(settings) || typeof navigator === 'undefined') return null;
    const gpu = this.gpu();
    if (gpu === null) return null;
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (adapter === null || source.byteLength > adapter.limits.maxStorageBufferBindingSize) return null;
    let device: GPUDevice | null = null;
    let validationScopeActive = false;
    const buffers: GPUBuffer[] = [];
    try {
      device = await adapter.requestDevice();
      device.pushErrorScope('validation');
      validationScopeActive = true;
      const sourceWords = this.packSource(source);
      const sourceBuffer = this.buffer(device, sourceWords.byteLength, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC);
      const outputBuffer = this.buffer(device, sourceWords.byteLength, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
      const readBuffer = this.buffer(device, sourceWords.byteLength, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);
      buffers.push(sourceBuffer, outputBuffer, readBuffer);
      const encoder = device.createCommandEncoder({ label: 'RAWcket development commands' });
      const maskRasterization = this.maskRasterizer.rasterize(device, encoder, sourceBuffer, width, height, settings.masks);
      if (maskRasterization === null) return null;
      buffers.push(...maskRasterization.resources);
      const parameters = this.parameters(settings, width, height);
      const parameterBuffer = this.buffer(device, parameters.byteLength, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
      buffers.push(parameterBuffer);
      const curves = this.curves(settings);
      const curveBuffer = this.buffer(device, curves.byteLength, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
      buffers.push(curveBuffer);
      const localAdjustments = this.localAdjustments(settings);
      const localAdjustmentBuffer = this.buffer(device, localAdjustments.byteLength, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
      buffers.push(localAdjustmentBuffer);
      device.queue.writeBuffer(sourceBuffer, 0, sourceWords);
      device.queue.writeBuffer(parameterBuffer, 0, parameters);
      device.queue.writeBuffer(curveBuffer, 0, curves);
      device.queue.writeBuffer(localAdjustmentBuffer, 0, localAdjustments);
      const module = device.createShaderModule({ label: 'RAWcket global development', code: computeShader });
      const pipeline = device.createComputePipeline({
        label: 'RAWcket global development pipeline',
        layout: 'auto',
        compute: { module, entryPoint: 'develop' }
      });
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: sourceBuffer } },
          { binding: 1, resource: { buffer: outputBuffer } },
          { binding: 2, resource: { buffer: parameterBuffer } },
          { binding: 3, resource: { buffer: curveBuffer } },
          { binding: 4, resource: { buffer: maskRasterization.weights } },
          { binding: 5, resource: { buffer: localAdjustmentBuffer } }
        ]
      });
      const pass = encoder.beginComputePass({ label: 'RAWcket development pass' });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16));
      pass.end();
      const finalBuffer = this.encodeSpatialPasses(
        device,
        encoder,
        outputBuffer,
        sourceBuffer,
        width,
        height,
        this.activeAdjustments(settings),
        buffers
      );
      encoder.copyBufferToBuffer(finalBuffer, 0, readBuffer, 0, sourceWords.byteLength);
      device.queue.submit([encoder.finish()]);
      const validationError = await device.popErrorScope();
      validationScopeActive = false;
      if (validationError !== null) throw new Error(`WebGPU validation failed: ${validationError.message}`);
      await Promise.race([
        readBuffer.mapAsync(GPUMapMode.READ),
        device.lost.then((loss) => Promise.reject(new Error(`WebGPU device lost: ${loss.message}`)))
      ]);
      const copy = new Uint32Array(new ArrayBuffer(sourceWords.byteLength));
      copy.set(new Uint32Array(readBuffer.getMappedRange()));
      readBuffer.unmap();
      return this.unpackOutput(copy);
    } catch {
      return null;
    } finally {
      if (validationScopeActive && device !== null) await device.popErrorScope().catch(() => null);
      buffers.forEach((buffer) => buffer.destroy());
      device?.destroy();
    }
  }

  private canDevelop(settings: CpuDevelopmentSettings): boolean {
    return settings.masks.length <= maximumGpuMasks;
  }

  private encodeSpatialPasses(
    device: GPUDevice,
    encoder: GPUCommandEncoder,
    globalOutput: GPUBuffer,
    reusableSource: GPUBuffer,
    width: number,
    height: number,
    adjustments: GlobalAdjustmentsPrimitives,
    buffers: GPUBuffer[]
  ): GPUBuffer {
    const passes = [
      { mode: 0, amount: adjustments.noiseReduction / 100 },
      { mode: 1, amount: adjustments.texture / 125 },
      { mode: 1, amount: adjustments.sharpness / 100 }
    ].filter((pass) => pass.amount > 0);
    if (passes.length === 0) return globalOutput;
    const module = device.createShaderModule({ label: 'RAWcket spatial development', code: spatialComputeShader });
    const pipeline = device.createComputePipeline({
      label: 'RAWcket spatial development pipeline',
      layout: 'auto',
      compute: { module, entryPoint: 'spatialFilter' }
    });
    let input = globalOutput;
    let output = reusableSource;
    for (const definition of passes) {
      const parameters = this.spatialParameters(width, height, definition.mode, definition.amount);
      const parameterBuffer = this.buffer(device, parameters.byteLength, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
      buffers.push(parameterBuffer);
      device.queue.writeBuffer(parameterBuffer, 0, parameters);
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: input } },
          { binding: 1, resource: { buffer: output } },
          { binding: 2, resource: { buffer: parameterBuffer } }
        ]
      });
      const pass = encoder.beginComputePass({ label: definition.mode === 0 ? 'RAWcket denoise pass' : 'RAWcket sharpen pass' });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16));
      pass.end();
      [input, output] = [output, input];
    }
    return input;
  }

  private spatialParameters(width: number, height: number, mode: number, amount: number): ArrayBuffer {
    const buffer = new ArrayBuffer(16);
    const integers = new Uint32Array(buffer);
    const floats = new Float32Array(buffer);
    integers[0] = width;
    integers[1] = height;
    integers[2] = mode;
    floats[3] = amount;
    return buffer;
  }

  private gpu(): GPU | null {
    const candidate: unknown = Reflect.get(navigator, 'gpu');
    if (typeof candidate !== 'object' || candidate === null || !('requestAdapter' in candidate)) return null;
    return candidate as GPU;
  }

  private activeAdjustments(settings: CpuDevelopmentSettings): GlobalAdjustmentsPrimitives {
    const active = { ...settings.adjustments };
    for (const key of settings.disabledAdjustments) active[key] = 0;
    return active;
  }

  private parameters(settings: CpuDevelopmentSettings, width: number, height: number): ArrayBuffer {
    const buffer = new ArrayBuffer(80);
    const floats = new Float32Array(buffer);
    const integers = new Uint32Array(buffer);
    const active = this.activeAdjustments(settings);
    adjustmentOrder.forEach((key, index) => { floats[index] = active[key]; });
    integers[16] = width;
    integers[17] = height;
    integers[18] = settings.curves.luminance === null ? 0 : 1;
    integers[19] = settings.masks.length;
    return buffer;
  }

  private localAdjustments(settings: CpuDevelopmentSettings): Float32Array<ArrayBuffer> {
    const values = new Float32Array(new ArrayBuffer(Math.max(1, settings.masks.length * adjustmentOrder.length) * Float32Array.BYTES_PER_ELEMENT));
    settings.masks.forEach((mask, maskIndex) => {
      adjustmentOrder.forEach((key, adjustmentIndex) => {
        values[maskIndex * adjustmentOrder.length + adjustmentIndex] = mask.localAdjustments[key] ?? 0;
      });
    });
    return values;
  }

  private curves(settings: CpuDevelopmentSettings): Float32Array<ArrayBuffer> {
    const definitions = [
      settings.curves.rgb,
      settings.curves.red,
      settings.curves.green,
      settings.curves.blue,
      settings.curves.luminance ?? settings.curves.rgb
    ];
    const values = new Float32Array(new ArrayBuffer(definitions.length * 1024 * Float32Array.BYTES_PER_ELEMENT));
    definitions.forEach((curve, index) => values.set(ToneCurveLut.create(curve).toFloat32Array(), index * 1024));
    return values;
  }

  private packSource(source: Uint8ClampedArray): Uint32Array<ArrayBuffer> {
    const packed = new Uint32Array(new ArrayBuffer(source.length));
    for (let pixel = 0; pixel < packed.length; pixel += 1) {
      const offset = pixel * 4;
      packed[pixel] = (source[offset] ?? 0)
        | (source[offset + 1] ?? 0) << 8
        | (source[offset + 2] ?? 0) << 16
        | (source[offset + 3] ?? 255) << 24;
    }
    return packed;
  }

  private unpackOutput(packed: Uint32Array): Uint8ClampedArray<ArrayBuffer> {
    const output = new Uint8ClampedArray(new ArrayBuffer(packed.length * 4));
    packed.forEach((value, pixel) => {
      const offset = pixel * 4;
      output[offset] = value & 255;
      output[offset + 1] = value >>> 8 & 255;
      output[offset + 2] = value >>> 16 & 255;
      output[offset + 3] = value >>> 24 & 255;
    });
    return output;
  }

  private buffer(device: GPUDevice, size: number, usage: GPUBufferUsageFlags): GPUBuffer {
    return device.createBuffer({ size, usage });
  }
}

const computeShader = `
struct Parameters {
  a0: vec4f,
  a1: vec4f,
  a2: vec4f,
  a3: vec4f,
  dimensions: vec2u,
  hasLuminanceCurve: u32,
  maskCount: u32,
}

@group(0) @binding(0) var<storage, read> source: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;
@group(0) @binding(2) var<uniform> parameters: Parameters;
@group(0) @binding(3) var<storage, read> curves: array<f32>;
@group(0) @binding(4) var<storage, read> maskWeights: array<f32>;
@group(0) @binding(5) var<storage, read> localAdjustments: array<f32>;

fn luminance(rgb: vec3f) -> f32 { return dot(rgb, vec3f(0.2126, 0.7152, 0.0722)); }
fn shapedStep(start: f32, end: f32, value: f32) -> f32 {
  let x = clamp((value - start) / (end - start), 0.0, 1.0);
  return x * x * (3.0 - 2.0 * x);
}
fn curve(channel: u32, value: f32) -> f32 {
  let position = clamp(value, 0.0, 1.0) * 1023.0;
  let lower = u32(floor(position));
  let upper = min(1023u, lower + 1u);
  let offset = channel * 1024u;
  return mix(curves[offset + lower], curves[offset + upper], position - f32(lower));
}
fn unpack(value: u32) -> vec4f {
  return vec4f(
    f32(value & 255u),
    f32((value >> 8u) & 255u),
    f32((value >> 16u) & 255u),
    f32((value >> 24u) & 255u)
  ) / 255.0;
}
fn pack(value: vec4f) -> u32 {
  let bytes = vec4u(round(clamp(value, vec4f(0.0), vec4f(1.0)) * 255.0));
  return bytes.r | (bytes.g << 8u) | (bytes.b << 16u) | (bytes.a << 24u);
}
fn localAdjustment(mask: u32, adjustment: u32) -> f32 {
  return localAdjustments[mask * 16u + adjustment];
}
fn developLocal(sourceRgb: vec3f, mask: u32) -> vec3f {
  var rgb = sourceRgb * exp2(localAdjustment(mask, 0u));
  let temperature = localAdjustment(mask, 1u) / 100.0;
  let tint = localAdjustment(mask, 2u) / 100.0;
  rgb.r += temperature * 0.15 - tint * 0.035;
  rgb.g += tint * 0.12 - abs(temperature) * 0.015;
  rgb.b -= temperature * 0.15 + tint * 0.035;
  var light = luminance(rgb);
  let tonalDelta = (1.0 - shapedStep(0.0, 0.55, light)) * localAdjustment(mask, 5u) / 400.0
    + shapedStep(0.45, 1.0, light) * localAdjustment(mask, 4u) / 400.0
    + light * localAdjustment(mask, 6u) / 500.0
    + (1.0 - light) * localAdjustment(mask, 7u) / 500.0;
  rgb += vec3f(tonalDelta);
  let contrast = 1.0 + localAdjustment(mask, 3u) / 100.0;
  let clarityWeight = 1.0 - min(1.0, abs(light - 0.5) * 2.0);
  let clarity = 1.0 + localAdjustment(mask, 10u) / 180.0 * clarityWeight;
  let dehaze = 1.0 + localAdjustment(mask, 12u) / 140.0;
  rgb = ((rgb - vec3f(0.5)) * contrast * clarity + vec3f(0.5)) * dehaze;
  light = luminance(rgb);
  let chroma = max(max(rgb.r, rgb.g), rgb.b) - min(min(rgb.r, rgb.g), rgb.b);
  let saturation = 1.0 + localAdjustment(mask, 8u) / 100.0;
  let vibrance = 1.0 + localAdjustment(mask, 9u) / 100.0 * (1.0 - min(1.0, chroma));
  let colorFactor = saturation * vibrance * (1.0 + max(0.0, localAdjustment(mask, 12u)) / 300.0);
  return clamp(vec3f(light) + (rgb - vec3f(light)) * colorFactor, vec3f(0.0), vec3f(1.0));
}

@compute @workgroup_size(16, 16)
fn develop(@builtin(global_invocation_id) invocation: vec3u) {
  if (invocation.x >= parameters.dimensions.x || invocation.y >= parameters.dimensions.y) { return; }
  let index = invocation.y * parameters.dimensions.x + invocation.x;
  let pixelCount = parameters.dimensions.x * parameters.dimensions.y;
  let original = unpack(source[index]);
  var rgb = original.rgb * exp2(parameters.a0.x);
  let temperature = parameters.a0.y / 100.0;
  let tint = parameters.a0.z / 100.0;
  rgb.r += temperature * 0.15 - tint * 0.035;
  rgb.g += tint * 0.12 - abs(temperature) * 0.015;
  rgb.b -= temperature * 0.15 + tint * 0.035;
  var light = luminance(rgb);
  let tonalDelta = (1.0 - shapedStep(0.0, 0.55, light)) * parameters.a1.y / 400.0
    + shapedStep(0.45, 1.0, light) * parameters.a1.x / 400.0
    + light * parameters.a1.z / 500.0
    + (1.0 - light) * parameters.a1.w / 500.0;
  rgb += vec3f(tonalDelta);
  let contrast = 1.0 + parameters.a0.w / 100.0;
  let clarityWeight = 1.0 - min(1.0, abs(light - 0.5) * 2.0);
  let clarity = 1.0 + parameters.a2.z / 180.0 * clarityWeight;
  let dehaze = 1.0 + parameters.a3.x / 140.0;
  rgb = ((rgb - vec3f(0.5)) * contrast * clarity + vec3f(0.5)) * dehaze;
  light = luminance(rgb);
  let chroma = max(max(rgb.r, rgb.g), rgb.b) - min(min(rgb.r, rgb.g), rgb.b);
  let saturation = 1.0 + parameters.a2.x / 100.0;
  let vibrance = 1.0 + parameters.a2.y / 100.0 * (1.0 - min(1.0, chroma));
  let colorFactor = saturation * vibrance * (1.0 + max(0.0, parameters.a3.x) / 300.0);
  rgb = clamp(vec3f(light) + (rgb - vec3f(light)) * colorFactor, vec3f(0.0), vec3f(1.0));
  for (var mask = 0u; mask < parameters.maskCount; mask += 1u) {
    let weight = maskWeights[mask * pixelCount + index];
    if (weight > 0.0) { rgb = mix(rgb, developLocal(rgb, mask), weight); }
  }
  rgb = vec3f(curve(1u, curve(0u, rgb.r)), curve(2u, curve(0u, rgb.g)), curve(3u, curve(0u, rgb.b)));
  if (parameters.hasLuminanceCurve == 1u) {
    let beforeLight = luminance(rgb);
    let afterLight = curve(4u, beforeLight);
    rgb *= select(0.0, afterLight / beforeLight, beforeLight > 0.000001);
  }
  rgb = clamp(rgb, vec3f(0.0), vec3f(1.0));
  let vignette = parameters.a3.w;
  if (vignette != 0.0) {
    let point = (vec2f(invocation.xy) + vec2f(0.5)) / vec2f(parameters.dimensions);
    let distanceFromCenter = length((point - vec2f(0.5)) * vec2f(1.25, 1.0)) * 1.6;
    let edge = shapedStep(0.28, 0.92, distanceFromCenter);
    let strength = select(0.45, 0.8, vignette < 0.0);
    rgb = clamp(rgb * (1.0 + vignette / 100.0 * edge * strength), vec3f(0.0), vec3f(1.0));
  }
  output[index] = pack(vec4f(rgb, original.a));
}`;

const spatialComputeShader = `
struct SpatialParameters {
  dimensions: vec2u,
  mode: u32,
  amount: f32,
}

@group(0) @binding(0) var<storage, read> source: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;
@group(0) @binding(2) var<uniform> parameters: SpatialParameters;

fn unpack(value: u32) -> vec4f {
  return vec4f(
    f32(value & 255u),
    f32((value >> 8u) & 255u),
    f32((value >> 16u) & 255u),
    f32((value >> 24u) & 255u)
  ) / 255.0;
}
fn pack(value: vec4f) -> u32 {
  let bytes = vec4u(round(clamp(value, vec4f(0.0), vec4f(1.0)) * 255.0));
  return bytes.r | (bytes.g << 8u) | (bytes.b << 16u) | (bytes.a << 24u);
}
fn sourceAt(x: i32, y: i32) -> vec4f {
  let safeX = u32(clamp(x, 0, i32(parameters.dimensions.x) - 1));
  let safeY = u32(clamp(y, 0, i32(parameters.dimensions.y) - 1));
  return unpack(source[safeY * parameters.dimensions.x + safeX]);
}

@compute @workgroup_size(16, 16)
fn spatialFilter(@builtin(global_invocation_id) invocation: vec3u) {
  if (invocation.x >= parameters.dimensions.x || invocation.y >= parameters.dimensions.y) { return; }
  let index = invocation.y * parameters.dimensions.x + invocation.x;
  let x = i32(invocation.x);
  let y = i32(invocation.y);
  let center = sourceAt(x, y);
  var average = vec3f(0.0);
  for (var offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (var offsetX = -1; offsetX <= 1; offsetX += 1) {
      average += sourceAt(x + offsetX, y + offsetY).rgb;
    }
  }
  average /= 9.0;
  let rgb = select(
    mix(center.rgb, average, parameters.amount),
    clamp(center.rgb + (center.rgb - average) * parameters.amount * 1.5, vec3f(0.0), vec3f(1.0)),
    parameters.mode == 1u
  );
  output[index] = pack(vec4f(rgb, center.a));
}`;
