import type { GlobalAdjustmentsPrimitives } from '../../domain/GlobalAdjustments';
import type { CpuDevelopmentSettings } from './CpuPixelDeveloper';
import { ToneCurveLut } from './ToneCurveLut';
import { WebGl2MaskWeightRasterizer } from './WebGl2MaskWeightRasterizer';

const adjustmentOrder = [
  'exposure', 'temperature', 'tint', 'contrast', 'highlights', 'shadows', 'whites', 'blacks',
  'saturation', 'vibrance', 'clarity', 'texture', 'dehaze', 'sharpness', 'noiseReduction', 'vignette'
] as const;
const maximumWebGlMasks = 4;

export class WebGl2PixelDeveloper {
  private readonly maskRasterizer = new WebGl2MaskWeightRasterizer();

  public develop(
    source: Uint8ClampedArray,
    width: number,
    height: number,
    settings: CpuDevelopmentSettings
  ): Uint8ClampedArray<ArrayBuffer> | null {
    if (!this.canDevelop(settings) || typeof OffscreenCanvas === 'undefined') return null;
    const canvas = new OffscreenCanvas(width, height);
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      stencil: false
    });
    if (gl === null) return null;
    try {
      return this.render(gl, source, width, height, settings);
    } catch {
      return null;
    } finally {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }

  private canDevelop(settings: CpuDevelopmentSettings): boolean {
    return settings.masks.length <= maximumWebGlMasks;
  }

  private render(
    gl: WebGL2RenderingContext,
    source: Uint8ClampedArray,
    width: number,
    height: number,
    settings: CpuDevelopmentSettings
  ): Uint8ClampedArray<ArrayBuffer> {
    if (source.length !== width * height * 4) throw new Error('Image dimensions do not match the WebGL2 pixel buffer.');
    const program = this.createProgram(gl, fragmentShader);
    gl.useProgram(program);
    const vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    const textures: WebGLTexture[] = [];
    const sourceTexture = this.createSourceTexture(gl, source, width, height);
    textures.push(sourceTexture);
    this.bindTexture(gl, program, sourceTexture, 'uSource', 0);
    const curves = settings.curves;
    const curveDefinitions = [curves.rgb, curves.red, curves.green, curves.blue, curves.luminance ?? curves.rgb];
    const curveNames = ['uRgbCurve', 'uRedCurve', 'uGreenCurve', 'uBlueCurve', 'uLuminanceCurve'];
    curveDefinitions.forEach((curve, index) => {
      const texture = this.createLutTexture(gl, ToneCurveLut.create(curve).toFloat32Array());
      textures.push(texture);
      this.bindTexture(gl, program, texture, curveNames[index] ?? '', index + 1);
    });
    const adjustments = this.activeAdjustments(settings);
    const location = gl.getUniformLocation(program, 'uAdjustments[0]');
    if (location === null) throw new Error('The WebGL2 adjustment uniform is unavailable.');
    gl.uniform1fv(location, new Float32Array(adjustmentOrder.map((key) => adjustments[key])));
    this.uniform1i(gl, program, 'uHasLuminanceCurve', curves.luminance === null ? 0 : 1);
    this.uniform2f(gl, program, 'uDimensions', width, height);
    const maskTexture = this.maskRasterizer.rasterize(gl, sourceTexture, width, height, settings.masks);
    if (maskTexture === null) throw new Error('The WebGL2 vector masks exceeded the accelerated rasterizer limits.');
    this.assertNoGraphicsError(gl, 'vector-mask rasterization');
    gl.useProgram(program);
    textures.push(maskTexture);
    this.bindTexture(gl, program, maskTexture, 'uMaskWeights', 6);
    this.uniform1i(gl, program, 'uMaskCount', settings.masks.length);
    const localAdjustmentLocation = gl.getUniformLocation(program, 'uLocalAdjustments[0]');
    if (localAdjustmentLocation === null) throw new Error('The WebGL2 local-adjustment uniform is unavailable.');
    gl.uniform1fv(localAdjustmentLocation, this.localAdjustments(settings));
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    let inputTexture = this.createOutputTexture(gl, width, height);
    let outputTexture = this.createOutputTexture(gl, width, height);
    textures.push(inputTexture, outputTexture);
    this.attachOutput(gl, inputTexture);
    gl.viewport(0, 0, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.assertNoGraphicsError(gl, 'global development');
    const spatialProgram = this.createProgram(gl, spatialFragmentShader);
    const spatialPasses = [
      { mode: 0, amount: adjustments.noiseReduction / 100 },
      { mode: 1, amount: adjustments.texture / 125 },
      { mode: 1, amount: adjustments.sharpness / 100 }
    ].filter((pass) => pass.amount > 0);
    if (spatialPasses.length > 0) {
      gl.useProgram(spatialProgram);
      this.uniform2f(gl, spatialProgram, 'uDimensions', width, height);
      for (const definition of spatialPasses) {
        this.bindTexture(gl, spatialProgram, inputTexture, 'uSource', 0);
        this.uniform1i(gl, spatialProgram, 'uMode', definition.mode);
        this.uniform1f(gl, spatialProgram, 'uAmount', definition.amount);
        this.attachOutput(gl, outputTexture);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        this.assertNoGraphicsError(gl, 'spatial development');
        [inputTexture, outputTexture] = [outputTexture, inputTexture];
      }
    }
    this.attachOutput(gl, inputTexture);
    const outputPixels = new Uint8ClampedArray(new ArrayBuffer(source.length));
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, outputPixels);
    this.assertNoGraphicsError(gl, 'pixel readback');
    textures.forEach((texture) => gl.deleteTexture(texture));
    gl.deleteVertexArray(vertexArray);
    gl.deleteProgram(program);
    gl.deleteProgram(spatialProgram);
    gl.deleteFramebuffer(framebuffer);
    return outputPixels;
  }

  private activeAdjustments(settings: CpuDevelopmentSettings): GlobalAdjustmentsPrimitives {
    const active = { ...settings.adjustments };
    for (const key of settings.disabledAdjustments) active[key] = 0;
    return active;
  }

  private assertNoGraphicsError(gl: WebGL2RenderingContext, stage: string): void {
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new Error(`The WebGL2 ${stage} pass failed with graphics error ${error}.`);
  }

  private createProgram(gl: WebGL2RenderingContext, fragmentSource: string): WebGLProgram {
    const vertex = this.compile(gl, gl.VERTEX_SHADER, `#version 300 es
      void main() {
        vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
        gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
      }
    `);
    const fragment = this.compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) ?? 'Unknown WebGL2 link failure.';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  private compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (shader === null) throw new Error('A WebGL2 development shader could not be created.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) ?? 'Unknown WebGL2 shader failure.';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  private createSourceTexture(gl: WebGL2RenderingContext, source: Uint8ClampedArray, width: number, height: number): WebGLTexture {
    const texture = this.texture(gl);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    return texture;
  }

  private createLutTexture(gl: WebGL2RenderingContext, values: Float32Array): WebGLTexture {
    const texture = this.texture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, values.length, 1, 0, gl.RED, gl.FLOAT, values);
    return texture;
  }

  private createOutputTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
    const texture = this.texture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return texture;
  }

  private localAdjustments(settings: CpuDevelopmentSettings): Float32Array<ArrayBuffer> {
    const values = new Float32Array(new ArrayBuffer(maximumWebGlMasks * adjustmentOrder.length * Float32Array.BYTES_PER_ELEMENT));
    settings.masks.forEach((mask, maskIndex) => {
      adjustmentOrder.forEach((key, adjustmentIndex) => {
        values[maskIndex * adjustmentOrder.length + adjustmentIndex] = mask.localAdjustments[key] ?? 0;
      });
    });
    return values;
  }

  private attachOutput(gl: WebGL2RenderingContext, texture: WebGLTexture): void {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('The WebGL2 development framebuffer is incomplete.');
    }
  }

  private texture(gl: WebGL2RenderingContext): WebGLTexture {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + 15);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  private bindTexture(gl: WebGL2RenderingContext, program: WebGLProgram, texture: WebGLTexture, name: string, unit: number): void {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    this.uniform1i(gl, program, name, unit);
  }

  private uniform1i(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, value: number): void {
    const location = gl.getUniformLocation(program, name);
    if (location === null) throw new Error(`The WebGL2 ${name} uniform is unavailable.`);
    gl.uniform1i(location, value);
  }

  private uniform2f(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, first: number, second: number): void {
    const location = gl.getUniformLocation(program, name);
    if (location === null) throw new Error(`The WebGL2 ${name} uniform is unavailable.`);
    gl.uniform2f(location, first, second);
  }

  private uniform1f(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, value: number): void {
    const location = gl.getUniformLocation(program, name);
    if (location === null) throw new Error(`The WebGL2 ${name} uniform is unavailable.`);
    gl.uniform1f(location, value);
  }
}

const fragmentShader = `#version 300 es
precision highp float;
precision highp sampler2D;
out vec4 outputColor;
uniform sampler2D uSource;
uniform sampler2D uRgbCurve;
uniform sampler2D uRedCurve;
uniform sampler2D uGreenCurve;
uniform sampler2D uBlueCurve;
uniform sampler2D uLuminanceCurve;
uniform float uAdjustments[16];
uniform float uLocalAdjustments[64];
uniform int uHasLuminanceCurve;
uniform int uMaskCount;
uniform vec2 uDimensions;
uniform sampler2D uMaskWeights;

float luminance(vec3 rgb) { return dot(rgb, vec3(0.2126, 0.7152, 0.0722)); }
float shapedStep(float start, float end, float value) {
  float x = clamp((value - start) / (end - start), 0.0, 1.0);
  return x * x * (3.0 - 2.0 * x);
}
float curve(sampler2D lut, float value) {
  float position = clamp(value, 0.0, 1.0) * 1023.0;
  int lower = int(floor(position));
  int upper = min(1023, lower + 1);
  return mix(texelFetch(lut, ivec2(lower, 0), 0).r, texelFetch(lut, ivec2(upper, 0), 0).r, position - float(lower));
}
float localAdjustment(int mask, int adjustment) {
  return uLocalAdjustments[mask * 16 + adjustment];
}
vec3 developLocal(vec3 sourceRgb, int mask) {
  vec3 rgb = sourceRgb * exp2(localAdjustment(mask, 0));
  float temperature = localAdjustment(mask, 1) / 100.0;
  float tint = localAdjustment(mask, 2) / 100.0;
  rgb.r += temperature * 0.15 - tint * 0.035;
  rgb.g += tint * 0.12 - abs(temperature) * 0.015;
  rgb.b -= temperature * 0.15 + tint * 0.035;
  float light = luminance(rgb);
  float tonalDelta = (1.0 - shapedStep(0.0, 0.55, light)) * localAdjustment(mask, 5) / 400.0
    + shapedStep(0.45, 1.0, light) * localAdjustment(mask, 4) / 400.0
    + light * localAdjustment(mask, 6) / 500.0
    + (1.0 - light) * localAdjustment(mask, 7) / 500.0;
  rgb += vec3(tonalDelta);
  float contrast = 1.0 + localAdjustment(mask, 3) / 100.0;
  float clarityWeight = 1.0 - min(1.0, abs(light - 0.5) * 2.0);
  float clarity = 1.0 + localAdjustment(mask, 10) / 180.0 * clarityWeight;
  float dehaze = 1.0 + localAdjustment(mask, 12) / 140.0;
  rgb = ((rgb - vec3(0.5)) * contrast * clarity + vec3(0.5)) * dehaze;
  light = luminance(rgb);
  float chroma = max(max(rgb.r, rgb.g), rgb.b) - min(min(rgb.r, rgb.g), rgb.b);
  float saturation = 1.0 + localAdjustment(mask, 8) / 100.0;
  float vibrance = 1.0 + localAdjustment(mask, 9) / 100.0 * (1.0 - min(1.0, chroma));
  float colorFactor = saturation * vibrance * (1.0 + max(0.0, localAdjustment(mask, 12)) / 300.0);
  return clamp(vec3(light) + (rgb - vec3(light)) * colorFactor, 0.0, 1.0);
}
void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy - vec2(0.5));
  vec4 source = texelFetch(uSource, pixel, 0);
  vec3 rgb = source.rgb * exp2(uAdjustments[0]);
  float temperature = uAdjustments[1] / 100.0;
  float tint = uAdjustments[2] / 100.0;
  rgb.r += temperature * 0.15 - tint * 0.035;
  rgb.g += tint * 0.12 - abs(temperature) * 0.015;
  rgb.b -= temperature * 0.15 + tint * 0.035;
  float light = luminance(rgb);
  float tonalDelta = (1.0 - shapedStep(0.0, 0.55, light)) * uAdjustments[5] / 400.0
    + shapedStep(0.45, 1.0, light) * uAdjustments[4] / 400.0
    + light * uAdjustments[6] / 500.0
    + (1.0 - light) * uAdjustments[7] / 500.0;
  rgb += vec3(tonalDelta);
  float contrast = 1.0 + uAdjustments[3] / 100.0;
  float clarityWeight = 1.0 - min(1.0, abs(light - 0.5) * 2.0);
  float clarity = 1.0 + uAdjustments[10] / 180.0 * clarityWeight;
  float dehaze = 1.0 + uAdjustments[12] / 140.0;
  rgb = ((rgb - vec3(0.5)) * contrast * clarity + vec3(0.5)) * dehaze;
  light = luminance(rgb);
  float chroma = max(max(rgb.r, rgb.g), rgb.b) - min(min(rgb.r, rgb.g), rgb.b);
  float saturation = 1.0 + uAdjustments[8] / 100.0;
  float vibrance = 1.0 + uAdjustments[9] / 100.0 * (1.0 - min(1.0, chroma));
  float colorFactor = saturation * vibrance * (1.0 + max(0.0, uAdjustments[12]) / 300.0);
  rgb = clamp(vec3(light) + (rgb - vec3(light)) * colorFactor, 0.0, 1.0);
  vec4 maskWeights = texelFetch(uMaskWeights, pixel, 0);
  for (int mask = 0; mask < 4; mask += 1) {
    if (mask < uMaskCount && maskWeights[mask] > 0.0) {
      rgb = mix(rgb, developLocal(rgb, mask), maskWeights[mask]);
    }
  }
  rgb = vec3(
    curve(uRedCurve, curve(uRgbCurve, rgb.r)),
    curve(uGreenCurve, curve(uRgbCurve, rgb.g)),
    curve(uBlueCurve, curve(uRgbCurve, rgb.b))
  );
  if (uHasLuminanceCurve == 1) {
    float beforeLight = luminance(rgb);
    float afterLight = curve(uLuminanceCurve, beforeLight);
    rgb *= beforeLight <= 0.000001 ? 0.0 : afterLight / beforeLight;
  }
  rgb = clamp(rgb, 0.0, 1.0);
  float vignette = uAdjustments[15];
  if (vignette != 0.0) {
    vec2 point = gl_FragCoord.xy / uDimensions;
    float distanceFromCenter = length((point - vec2(0.5)) * vec2(1.25, 1.0)) * 1.6;
    float edge = shapedStep(0.28, 0.92, distanceFromCenter);
    float strength = vignette < 0.0 ? 0.8 : 0.45;
    rgb = clamp(rgb * (1.0 + vignette / 100.0 * edge * strength), 0.0, 1.0);
  }
  outputColor = vec4(rgb, source.a);
}`;

const spatialFragmentShader = `#version 300 es
precision highp float;
precision highp sampler2D;
out vec4 outputColor;
uniform sampler2D uSource;
uniform vec2 uDimensions;
uniform int uMode;
uniform float uAmount;

void main() {
  ivec2 centerCoordinate = ivec2(gl_FragCoord.xy - vec2(0.5));
  vec4 center = texelFetch(uSource, centerCoordinate, 0);
  vec3 average = vec3(0.0);
  ivec2 maximum = ivec2(uDimensions) - ivec2(1);
  for (int offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (int offsetX = -1; offsetX <= 1; offsetX += 1) {
      average += texelFetch(uSource, clamp(centerCoordinate + ivec2(offsetX, offsetY), ivec2(0), maximum), 0).rgb;
    }
  }
  average /= 9.0;
  vec3 rgb = uMode == 0
    ? mix(center.rgb, average, uAmount)
    : clamp(center.rgb + (center.rgb - average) * uAmount * 1.5, 0.0, 1.0);
  outputColor = vec4(rgb, center.a);
}`;
