import { ProjectId } from '@/contexts/projects/domain/value-objects/ProjectId';
import { CachingRenderSourceDecoder } from '@/contexts/projects/infrastructure/renderers/CachingRenderSourceDecoder';

describe('CachingRenderSourceDecoder', () => {
  it('develops a RAW once and gives every render its own transferable pixel buffer', async () => {
    const decodedPixels = new Uint16Array([1, 2, 3]);
    const decode = vi.fn().mockResolvedValue({
      kind: 'raw-linear-16-bit' as const,
      width: 1,
      height: 1,
      pixels: decodedPixels
    });
    const decoder = new CachingRenderSourceDecoder({ decode });
    const projectId = new ProjectId(crypto.randomUUID());
    const source = new Blob(['raw'], { type: 'image/x-sony-arw' });
    const statuses: string[] = [];

    const first = await decoder.decode(projectId, source, 'image/x-sony-arw', 2560, true, (status) => statuses.push(status));
    const second = await decoder.decode(projectId, source, 'image/x-sony-arw', 2560, true, (status) => statuses.push(status));

    expect(decode).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(['decoding', 'ready']);
    expect(first).toEqual(second);
    if (first.kind !== 'raw-linear-16-bit' || second.kind !== 'raw-linear-16-bit') throw new Error('Expected RAW pixels.');
    expect(first.pixels).not.toBe(second.pixels);
    first.pixels[0] = 65_535;
    expect(second.pixels[0]).toBe(1);
    expect(decodedPixels[0]).toBe(1);
  });

  it('coalesces concurrent requests for the same decoded source', async () => {
    let finishDecode: ((value: { kind: 'raw-linear-16-bit'; width: number; height: number; pixels: Uint16Array<ArrayBuffer> }) => void) | undefined;
    const decode = vi.fn().mockReturnValue(new Promise((resolve) => { finishDecode = resolve; }));
    const decoder = new CachingRenderSourceDecoder({ decode });
    const projectId = new ProjectId(crypto.randomUUID());
    const source = new Blob(['raw'], { type: 'image/x-sony-arw' });

    const first = decoder.decode(projectId, source, 'image/x-sony-arw', 2560, true, vi.fn());
    const second = decoder.decode(projectId, source, 'image/x-sony-arw', 2560, true, vi.fn());
    finishDecode?.({ kind: 'raw-linear-16-bit', width: 1, height: 1, pixels: new Uint16Array([1, 2, 3]) });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(decode).toHaveBeenCalledTimes(1);
  });

  it('decodes again when the preview resolution changes', async () => {
    const decode = vi.fn().mockResolvedValue({
      kind: 'raw-linear-16-bit' as const,
      width: 1,
      height: 1,
      pixels: new Uint16Array([1, 2, 3])
    });
    const decoder = new CachingRenderSourceDecoder({ decode });
    const projectId = new ProjectId(crypto.randomUUID());
    const source = new Blob(['raw'], { type: 'image/x-sony-arw' });

    await decoder.decode(projectId, source, 'image/x-sony-arw', 1280, true, vi.fn());
    await decoder.decode(projectId, source, 'image/x-sony-arw', 2560, true, vi.fn());

    expect(decode).toHaveBeenCalledTimes(2);
  });
});
