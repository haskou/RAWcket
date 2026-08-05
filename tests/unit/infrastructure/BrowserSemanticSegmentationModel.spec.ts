import { vi } from 'vitest';
import { SemanticMaskCategory } from '@/contexts/projects/domain/value-objects/SemanticMaskCategory';
import {
  BrowserSemanticSegmentationModel,
  type BrowserSemanticModelRuntime
} from '@/contexts/projects/infrastructure/ai/BrowserSemanticSegmentationModel';

type TestSemanticRuntime = BrowserSemanticModelRuntime & { deleteCache: ReturnType<typeof vi.fn> };

function installedRuntime(overrides: Partial<BrowserSemanticModelRuntime> = {}): TestSemanticRuntime {
  const cache = {
    match: vi.fn().mockResolvedValue(new Response('cached')),
    put: vi.fn().mockResolvedValue(undefined)
  };
  const deleteCache = vi.fn().mockResolvedValue(true);
  return {
    cacheStorage: {
      open: vi.fn().mockResolvedValue(cache),
      delete: deleteCache
    } as unknown as CacheStorage,
    cryptography: globalThis.crypto,
    fetchResource: vi.fn(),
    loadTransformers: vi.fn(),
    hasWebGpu: () => false,
    deleteCache,
    ...overrides
  };
}

describe('BrowserSemanticSegmentationModel', () => {
  it('reports unavailable without secure browser storage and keeps the pinned descriptor explicit', async () => {
    const model = new BrowserSemanticSegmentationModel({
      ...installedRuntime(),
      cacheStorage: undefined
    });

    expect(await model.inspect()).toBe('unavailable');
    expect(model.describe()).toEqual(expect.objectContaining({
      id: 'Xenova/segformer-b0-finetuned-ade-512-512',
      approximateDownloadBytes: 4_426_942,
      supportedCategories: ['sky', 'water', 'vegetation', 'people', 'buildings']
    }));
  });

  it('recognizes and removes a fully cached model', async () => {
    const runtime = installedRuntime();
    const model = new BrowserSemanticSegmentationModel(runtime);

    expect(await model.inspect()).toBe('installed');
    await model.remove();
    expect(runtime.deleteCache).toHaveBeenCalledWith('rawcket-semantic-segformer-b0-v1');
  });

  it('disposes an active inference pipeline when semantic work is cancelled', async () => {
    const controller = new AbortController();
    const dispose = vi.fn<() => Promise<void>>(() => Promise.resolve());
    const pipeline = Object.assign(vi.fn(() => {
      controller.abort();
      return Promise.resolve([]);
    }), { dispose });
    const runtime = installedRuntime({
      loadTransformers: vi.fn().mockResolvedValue({
        env: {},
        pipeline: vi.fn().mockResolvedValue(pipeline)
      }) as BrowserSemanticModelRuntime['loadTransformers']
    });
    const model = new BrowserSemanticSegmentationModel(runtime);

    await expect(model.suggest(
      new Blob(['preview'], { type: 'image/webp' }),
      SemanticMaskCategory.fromPrimitives('sky'),
      { signal: controller.signal }
    )).rejects.toMatchObject({ name: 'AbortError' });
    expect(dispose.mock.calls).toHaveLength(1);
  });
});
