import type { MaskDefinitionPrimitives } from '../../domain/MaskDefinition';
import { GpuMaskProgramEncoder } from './GpuMaskProgram';

const maximumOutputMasks = 4;

export class WebGl2MaskWeightRasterizer {
  private readonly programEncoder = new GpuMaskProgramEncoder();

  public rasterize(
    gl: WebGL2RenderingContext,
    source: WebGLTexture,
    width: number,
    height: number,
    masks: MaskDefinitionPrimitives[]
  ): WebGLTexture | null {
    const program = this.programEncoder.encode(masks);
    if (program === null || masks.length > maximumOutputMasks) return null;
    const maximumTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (program.nodes.length / 4 > maximumTextureSize || program.data.length / 4 > maximumTextureSize) return null;
    const output = this.floatTexture(gl, width, height, null);
    if (masks.length === 0) return output;
    if (gl.getExtension('EXT_color_buffer_float') === null) {
      gl.deleteTexture(output);
      return null;
    }

    const nodes = this.floatTexture(gl, program.nodes.length / 4, 1, program.nodes);
    const data = this.floatTexture(gl, program.data.length / 4, 1, program.data);
    let shader: WebGLProgram | null = null;
    const framebuffer = gl.createFramebuffer();
    try {
      shader = this.createProgram(gl);
      gl.useProgram(shader);
      this.bindTexture(gl, shader, source, 'uSource', 12);
      this.bindTexture(gl, shader, nodes, 'uNodes', 13);
      this.bindTexture(gl, shader, data, 'uData', 14);
      this.uniform2f(gl, shader, 'uDimensions', width, height);
      this.uniform1i(gl, shader, 'uNodeCount', program.nodeCount);
      this.uniform1i(gl, shader, 'uMaskCount', masks.length);
      const outputs = new Int32Array(maximumOutputMasks);
      outputs.set(program.outputs);
      const outputLocation = gl.getUniformLocation(shader, 'uOutputs[0]');
      if (outputLocation === null) throw new Error('The WebGL2 mask-output uniform is unavailable.');
      gl.uniform1iv(outputLocation, outputs);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, output, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('The WebGL2 vector-mask framebuffer is incomplete.');
      }
      gl.viewport(0, 0, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('The WebGL2 vector-mask pass failed.');
      return output;
    } catch {
      gl.deleteTexture(output);
      return null;
    } finally {
      gl.deleteTexture(nodes);
      gl.deleteTexture(data);
      if (shader !== null) gl.deleteProgram(shader);
      gl.deleteFramebuffer(framebuffer);
    }
  }

  private createProgram(gl: WebGL2RenderingContext): WebGLProgram {
    const vertex = this.compile(gl, gl.VERTEX_SHADER, `#version 300 es
      void main() {
        vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
        gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
      }
    `);
    const fragment = this.compile(gl, gl.FRAGMENT_SHADER, maskFragmentShader);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) ?? 'Unknown WebGL2 vector-mask link failure.';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  private compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (shader === null) throw new Error('A WebGL2 vector-mask shader could not be created.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) ?? 'Unknown WebGL2 vector-mask compilation failure.';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  private floatTexture(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    values: Float32Array<ArrayBuffer> | null
  ): WebGLTexture {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + 15);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, values);
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
}

const maskFragmentShader = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 outputColor;
uniform sampler2D uSource;
uniform sampler2D uNodes;
uniform sampler2D uData;
uniform vec2 uDimensions;
uniform int uNodeCount;
uniform int uMaskCount;
uniform int uOutputs[4];

vec4 nodeAt(int node, int part) { return texelFetch(uNodes, ivec2(node * 3 + part, 0), 0); }
vec4 dataAt(int index) { return texelFetch(uData, ivec2(index, 0), 0); }
float luminance(vec3 rgb) { return dot(rgb, vec3(0.2126, 0.7152, 0.0722)); }
float sourceLuminance(vec2 point) {
  ivec2 coordinate = min(ivec2(uDimensions) - ivec2(1), ivec2(floor(clamp(point, 0.0, 1.0) * uDimensions)));
  return luminance(texelFetch(uSource, coordinate, 0).rgb);
}
float distanceToSegment(vec2 point, vec2 start, vec2 end) {
  vec2 axis = end - start;
  float lengthSquared = dot(axis, axis);
  if (lengthSquared <= 0.000001) return distance(point, start);
  float position = clamp(dot(point - start, axis) / lengthSquared, 0.0, 1.0);
  return distance(point, start + position * axis);
}
float primitiveWeight(int kind, vec4 header, vec4 first, vec4 second, vec2 point, float light) {
  int offset = int(round(header.y));
  int count = int(round(header.z));
  if (kind == 1) {
    float weight = 0.0;
    for (int segment = 0; segment < count; segment += 1) {
      vec4 coordinates = dataAt(offset + segment * 2);
      vec4 properties = dataAt(offset + segment * 2 + 1);
      float pressure = abs(properties.w);
      float radius = max(0.0001, properties.x * max(0.15, pressure) / 2.0 + first.x);
      float hardRadius = radius * properties.y;
      float segmentDistance = distanceToSegment(point, coordinates.xy, coordinates.zw);
      float strokeWeight = segmentDistance <= hardRadius ? 1.0 : 1.0 - smoothstep(hardRadius, radius, segmentDistance);
      float contribution = strokeWeight * properties.z * max(0.15, pressure);
      weight = properties.w < 0.0 ? clamp(weight - contribution, 0.0, 1.0) : max(weight, contribution);
    }
    return weight;
  }
  if (kind == 2) {
    vec2 axis = first.zw - first.xy;
    float lengthSquared = dot(axis, axis);
    return lengthSquared <= 0.000001 ? 0.0 : clamp(dot(point - first.xy, axis) / lengthSquared + second.x, 0.0, 1.0);
  }
  if (kind == 3) {
    float cosine = cos(second.x);
    float sine = sin(second.x);
    vec2 delta = point - first.xy;
    vec2 rotated = vec2(delta.x * cosine - delta.y * sine, delta.x * sine + delta.y * cosine);
    vec2 radii = max(vec2(0.001), first.zw + vec2(second.y));
    return 1.0 - smoothstep(0.75, 1.0, length(rotated / radii));
  }
  if (kind == 4) return light >= first.x - first.z && light <= first.y + first.z ? 1.0 : 0.0;
  if (kind == 5) {
    float nearest = 1.414214;
    for (int item = 0; item < count; item += 1) nearest = min(nearest, distance(point, dataAt(offset + item).xy));
    float tolerance = max(0.001, first.x + first.y);
    return 1.0 - smoothstep(tolerance * 0.5, tolerance, nearest);
  }
  bool insideBox = false;
  float positiveDistance = 1.414214;
  float negativeDistance = 1.414214;
  float positiveLightDistance = 2.0;
  float negativeLightDistance = 2.0;
  for (int item = 0; item < count; item += 1) {
    vec4 definition = dataAt(offset + item);
    int itemKind = int(round(definition.x));
    if (itemKind == 1 || itemKind == 2) {
      float pointDistance = distance(point, definition.yz);
      float lightDistance = abs(light - sourceLuminance(definition.yz));
      if (itemKind == 1) {
        positiveDistance = min(positiveDistance, pointDistance);
        positiveLightDistance = min(positiveLightDistance, lightDistance);
      } else {
        negativeDistance = min(negativeDistance, pointDistance);
        negativeLightDistance = min(negativeLightDistance, lightDistance);
      }
    }
    if (itemKind == 3 && item + 1 < count) {
      float height = dataAt(offset + item + 1).y;
      insideBox = insideBox || (point.x >= definition.y - first.x && point.x <= definition.y + definition.w + first.x
        && point.y >= definition.z - first.x && point.y <= definition.z + height + first.x);
    }
  }
  bool matchesPositive = positiveLightDistance < 0.16 + first.x && positiveDistance < 0.45 + first.x;
  bool matchesNegative = negativeLightDistance < 0.1 && negativeDistance < max(0.01, 0.3 - first.x);
  return (insideBox || matchesPositive) && !matchesNegative ? 1.0 : 0.0;
}

void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy - vec2(0.5));
  vec2 point = gl_FragCoord.xy / uDimensions;
  float light = luminance(texelFetch(uSource, pixel, 0).rgb);
  float weights[256];
  for (int node = 0; node < 256; node += 1) {
    if (node >= uNodeCount) break;
    vec4 header = nodeAt(node, 0);
    vec4 first = nodeAt(node, 1);
    vec4 second = nodeAt(node, 2);
    int kind = int(round(header.x));
    if (kind <= 6) {
      weights[node] = primitiveWeight(kind, header, first, second, point, light);
    } else if (kind <= 9) {
      int offset = int(round(header.y));
      int count = int(round(header.z));
      float combined = kind == 7 ? 0.0 : 1.0;
      if (kind == 8) {
        combined = weights[int(round(dataAt(offset).x))];
        float removal = 0.0;
        for (int child = 1; child < count; child += 1) removal = max(removal, weights[int(round(dataAt(offset + child).x))]);
        combined = clamp(combined - removal, 0.0, 1.0);
      } else {
        for (int child = 0; child < count; child += 1) {
          float value = weights[int(round(dataAt(offset + child).x))];
          combined = kind == 7 ? max(combined, value) : min(combined, value);
        }
      }
      weights[node] = combined;
    } else {
      float value = weights[int(round(header.w))];
      float softened = value * value * (3.0 - 2.0 * value);
      value = mix(value, softened, first.w);
      if (first.y > 0.5) value = 1.0 - value;
      weights[node] = first.x > 0.5 ? clamp(value * first.z * second.x, 0.0, 1.0) : 0.0;
    }
  }
  outputColor = vec4(0.0);
  if (uMaskCount > 0) outputColor.r = weights[uOutputs[0]];
  if (uMaskCount > 1) outputColor.g = weights[uOutputs[1]];
  if (uMaskCount > 2) outputColor.b = weights[uOutputs[2]];
  if (uMaskCount > 3) outputColor.a = weights[uOutputs[3]];
}`;
