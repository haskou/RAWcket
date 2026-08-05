import type {
  ImageSegmentationPipelineOutput,
  ImageSegmentationPipelineType
} from '@huggingface/transformers';
import type {
  SemanticMaskSuggestion,
  SemanticModelDescriptor,
  SemanticModelStatus,
  SemanticModelTaskOptions,
  SemanticSegmentationModel
} from '../../application/ports/SemanticSegmentationModel';
import type {
  SemanticMaskCategory,
  SemanticMaskCategoryPrimitive
} from '../../domain/value-objects/SemanticMaskCategory';

type ModelResource = { path: string; bytes: number; sha256: string };
type SemanticPipelineOptions = {
  revision: string;
  local_files_only: boolean;
  dtype: 'q8';
  device: 'webgpu' | 'wasm';
  progress_callback: () => void;
};
type SemanticPipelineFactory = (
  task: 'image-segmentation',
  model: string,
  options: SemanticPipelineOptions
) => Promise<ImageSegmentationPipelineType>;
type TransformersLibrary = {
  env: {
    useBrowserCache: boolean;
    useCustomCache: boolean;
    customCache: Cache | null;
    allowLocalModels: boolean;
    allowRemoteModels: boolean;
  };
  pipeline: SemanticPipelineFactory;
};

export type BrowserSemanticModelRuntime = {
  cacheStorage: CacheStorage | undefined;
  cryptography: Crypto | undefined;
  fetchResource: typeof fetch;
  loadTransformers: () => Promise<TransformersLibrary>;
  hasWebGpu: () => boolean;
};

const modelId = 'Xenova/segformer-b0-finetuned-ade-512-512';
const modelVersion = 'd3e5499fa8701ff0453ca940a8dfeae39b2f1504';
const cacheName = 'rawcket-semantic-segformer-b0-v1';
const resources: ModelResource[] = [
  { path: 'config.json', bytes: 6_957, sha256: '435799652b2b64c3e422dea20fed4c59651dae9f0e291fd885e9e067fee0ce2a' },
  { path: 'preprocessor_config.json', bytes: 373, sha256: 'dbabd93c735c8a5c39ef207c6c4459bf2d261a5dcc55e1ba1c1b982e5947f518' },
  { path: 'quantize_config.json', bytes: 749, sha256: '700bcf011840dd517b8fcbd4e7aac164da208c5ef643aa4ecf87995551b1885f' },
  { path: 'onnx/model_quantized.onnx', bytes: 4_418_863, sha256: '9a98d6daf3d926869ab8cc4c2ed7374a2bc23b889bb7ca3b0915d15e3c4756bb' }
];

const categoryLabels: Record<SemanticMaskCategoryPrimitive, string[]> = {
  sky: ['sky'],
  water: ['water', 'sea', 'river', 'lake', 'swimming pool'],
  vegetation: ['tree', 'grass', 'plant', 'flower', 'field'],
  people: ['person'],
  buildings: ['building', 'house', 'skyscraper']
};

function browserRuntime(): BrowserSemanticModelRuntime {
  return {
    cacheStorage: typeof globalThis.caches === 'undefined' ? undefined : globalThis.caches,
    cryptography: typeof globalThis.crypto === 'undefined' ? undefined : globalThis.crypto,
    fetchResource: (...input) => globalThis.fetch(...input),
    loadTransformers: async () => {
      const library = await import('@huggingface/transformers');
      return {
        env: library.env,
        pipeline: library.pipeline as unknown as SemanticPipelineFactory
      };
    },
    hasWebGpu: () => typeof navigator !== 'undefined' && Reflect.has(navigator, 'gpu')
  };
}

export class BrowserSemanticSegmentationModel implements SemanticSegmentationModel {
  private activePipeline: ImageSegmentationPipelineType | null = null;

  public constructor(private readonly runtime: BrowserSemanticModelRuntime = browserRuntime()) {}

  public describe(): SemanticModelDescriptor {
    return {
      id: modelId,
      version: modelVersion,
      approximateDownloadBytes: resources.reduce((total, resource) => total + resource.bytes, 0),
      supportedCategories: Object.keys(categoryLabels) as SemanticMaskCategoryPrimitive[]
    };
  }

  public async inspect(): Promise<SemanticModelStatus> {
    if (this.runtime.cacheStorage === undefined || this.runtime.cryptography?.subtle === undefined) return 'unavailable';
    const cache = await this.runtime.cacheStorage.open(cacheName);
    const matches = await Promise.all(resources.map((resource) => cache.match(this.url(resource.path))));
    return matches.every((response) => response !== undefined) ? 'installed' : 'not-installed';
  }

  public async install(options: SemanticModelTaskOptions): Promise<void> {
    if (this.runtime.cacheStorage === undefined || this.runtime.cryptography?.subtle === undefined) {
      throw new Error('This browser cannot persist and verify a local semantic model. Manual masks remain available.');
    }
    const cache = await this.runtime.cacheStorage.open(cacheName);
    let completedBytes = 0;
    const totalBytes = resources.reduce((total, resource) => total + resource.bytes, 0);
    for (const resource of resources) {
      this.throwIfAborted(options.signal);
      const existing = await cache.match(this.url(resource.path));
      if (existing !== undefined) {
        completedBytes += resource.bytes;
        options.onProgress?.(completedBytes / totalBytes);
        continue;
      }
      const content = await this.download(resource, options.signal, (loaded) => {
        options.onProgress?.(Math.min(1, (completedBytes + loaded) / totalBytes));
      });
      await cache.put(this.url(resource.path), new Response(content, {
        headers: { 'content-type': resource.path.endsWith('.json') ? 'application/json' : 'application/octet-stream' }
      }));
      completedBytes += resource.bytes;
      options.onProgress?.(completedBytes / totalBytes);
    }
  }

  public async remove(): Promise<void> {
    if (this.activePipeline !== null) await this.activePipeline.dispose();
    this.activePipeline = null;
    if (this.runtime.cacheStorage !== undefined) await this.runtime.cacheStorage.delete(cacheName);
  }

  public async suggest(
    image: Blob,
    category: SemanticMaskCategory,
    options: SemanticModelTaskOptions
  ): Promise<SemanticMaskSuggestion> {
    if (await this.inspect() !== 'installed') throw new Error('Download the local semantic model before creating a semantic mask.');
    this.throwIfAborted(options.signal);
    const pipeline = await this.pipeline(options);
    this.throwIfAborted(options.signal);
    options.onProgress?.(0.55);
    this.throwIfAborted(options.signal);
    const cancelInference = (): void => {
      if (this.activePipeline !== pipeline) return;
      this.activePipeline = null;
      void pipeline.dispose();
    };
    options.signal.addEventListener('abort', cancelInference, { once: true });
    let output: ImageSegmentationPipelineOutput[];
    try {
      output = await pipeline(image, { subtask: 'semantic' });
    } finally {
      options.signal.removeEventListener('abort', cancelInference);
    }
    this.throwIfAborted(options.signal);
    options.onProgress?.(0.9);
    const suggestion = this.toSuggestion(output, category.valueOf(), options.signal);
    options.onProgress?.(1);
    return suggestion;
  }

  private async pipeline(options: SemanticModelTaskOptions): Promise<ImageSegmentationPipelineType> {
    if (this.activePipeline !== null) return this.activePipeline;
    if (this.runtime.cacheStorage === undefined) throw new Error('Local semantic model storage is unavailable.');
    const library = await this.runtime.loadTransformers();
    const cache = await this.runtime.cacheStorage.open(cacheName);
    library.env.useBrowserCache = false;
    library.env.useCustomCache = true;
    library.env.customCache = cache;
    library.env.allowLocalModels = true;
    library.env.allowRemoteModels = false;
    const progressCallback = (): void => options.onProgress?.(0.35);
    const hasWebGpu = this.runtime.hasWebGpu();
    try {
      this.activePipeline = await library.pipeline('image-segmentation', modelId, {
        revision: modelVersion,
        local_files_only: true,
        dtype: 'q8',
        device: hasWebGpu ? 'webgpu' : 'wasm',
        progress_callback: progressCallback
      });
    } catch (error: unknown) {
      if (!hasWebGpu) throw error;
      this.activePipeline = await library.pipeline('image-segmentation', modelId, {
        revision: modelVersion,
        local_files_only: true,
        dtype: 'q8',
        device: 'wasm',
        progress_callback: progressCallback
      });
    }
    return this.activePipeline;
  }

  private async download(resource: ModelResource, signal: AbortSignal, onProgress: (loaded: number) => void): Promise<Uint8Array<ArrayBuffer>> {
    const response = await this.runtime.fetchResource(this.url(resource.path), { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(`The local model resource ${resource.path} could not be downloaded.`);
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    if (reader === undefined) {
      const content = new Uint8Array(await response.arrayBuffer());
      chunks.push(content);
      loaded = content.byteLength;
      onProgress(loaded);
    } else {
      let result = await reader.read();
      while (!result.done) {
        chunks.push(result.value);
        loaded += result.value.byteLength;
        onProgress(loaded);
        result = await reader.read();
      }
    }
    this.throwIfAborted(signal);
    if (loaded !== resource.bytes) throw new Error(`The local model resource ${resource.path} has an unexpected size.`);
    const content = new Uint8Array(new ArrayBuffer(loaded));
    let offset = 0;
    for (const chunk of chunks) {
      content.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const cryptography = this.runtime.cryptography;
    if (cryptography === undefined) throw new Error('This browser cannot verify the local semantic model.');
    const digest = await cryptography.subtle.digest('SHA-256', content);
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    if (hash !== resource.sha256) throw new Error(`The local model resource ${resource.path} failed integrity verification.`);
    return content;
  }

  private toSuggestion(output: ImageSegmentationPipelineOutput[], category: SemanticMaskCategoryPrimitive, signal: AbortSignal): SemanticMaskSuggestion {
    const acceptedLabels = categoryLabels[category];
    const selected = output.filter((segment) => segment.label !== null && acceptedLabels.includes(segment.label.toLowerCase()));
    const first = selected[0];
    if (first === undefined) throw new Error(`The local model did not find a confident ${category} region. Try a smart-point or manual mask.`);
    const width = first.mask.width;
    const height = first.mask.height;
    const union = new Uint8Array(width * height);
    for (const segment of selected) {
      for (let index = 0; index < union.length; index += 1) {
        if ((segment.mask.data[index] ?? 0) > 0) union[index] = 1;
      }
    }
    let minimumX = width;
    let minimumY = height;
    let maximumX = -1;
    let maximumY = -1;
    let count = 0;
    for (let index = 0; index < union.length; index += 1) {
      if (index % 65_536 === 0) this.throwIfAborted(signal);
      if (union[index] !== 1) continue;
      const x = index % width;
      const y = Math.floor(index / width);
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
      count += 1;
    }
    if (count === 0) throw new Error(`The local model found no usable ${category} pixels.`);
    const interval = Math.max(1, Math.floor(count / 8));
    const positivePoints: Array<{ x: number; y: number }> = [];
    let visited = 0;
    for (let index = 0; index < union.length && positivePoints.length < 8; index += 1) {
      if (union[index] !== 1) continue;
      if (visited % interval === 0) positivePoints.push({
        x: (index % width + 0.5) / width,
        y: (Math.floor(index / width) + 0.5) / height
      });
      visited += 1;
    }
    const scores = selected.flatMap((segment) => segment.score === null ? [] : [segment.score]);
    return {
      positivePoints,
      boundingBoxes: [{
        x: minimumX / width,
        y: minimumY / height,
        width: (maximumX - minimumX + 1) / width,
        height: (maximumY - minimumY + 1) / height
      }],
      confidence: scores.length === 0 ? null : scores.reduce((total, score) => total + score, 0) / scores.length
    };
  }

  private url(path: string): string {
    return `https://huggingface.co/${modelId}/resolve/${modelVersion}/${path}`;
  }

  private throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) throw new DOMException('The local semantic task was cancelled.', 'AbortError');
  }
}
