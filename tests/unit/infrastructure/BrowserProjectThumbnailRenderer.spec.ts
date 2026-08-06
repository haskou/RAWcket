import { ExifOrientation } from '@/contexts/projects/domain/CaptureMetadata';
import {
  BrowserProjectThumbnailRenderer,
  type BrowserProjectThumbnailRuntime
} from '@/contexts/projects/infrastructure/renderers/BrowserProjectThumbnailRenderer';

function thumbnailRuntime(width = 400, height = 300): {
  runtime: BrowserProjectThumbnailRuntime;
  decode: ReturnType<typeof vi.fn>;
  createCanvas: ReturnType<typeof vi.fn>;
  setTransform: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
} {
  const close = vi.fn();
  const bitmap = { width, height, close };
  const setTransform = vi.fn();
  const drawImage = vi.fn();
  const decode = vi.fn().mockResolvedValue(bitmap);
  const createCanvas = vi.fn().mockReturnValue({
    getContext: vi.fn().mockReturnValue({ setTransform, drawImage }),
    convertToBlob: vi.fn().mockResolvedValue(new Blob(['thumbnail'], { type: 'image/webp' }))
  });
  return { runtime: { decode, createCanvas }, decode, createCanvas, setTransform, close };
}

describe('BrowserProjectThumbnailRenderer', () => {
  it('rotates a portrait EXIF source clockwise into a portrait canvas', async () => {
    const fixture = thumbnailRuntime();
    const source = new Blob(['preview'], { type: 'image/jpeg' });

    const thumbnail = await new BrowserProjectThumbnailRenderer(fixture.runtime).render(source, new ExifOrientation(6));

    expect(fixture.decode).toHaveBeenCalledWith(source, false);
    expect(fixture.createCanvas).toHaveBeenCalledWith(300, 400);
    expect(fixture.setTransform).toHaveBeenCalledWith(0, 1, -1, 0, 300, 0);
    expect(thumbnail.type).toBe('image/webp');
    expect(fixture.close).toHaveBeenCalledTimes(1);
  });

  it('lets the browser honor embedded JPEG orientation when project metadata has none', async () => {
    const fixture = thumbnailRuntime();
    const source = new Blob(['jpeg'], { type: 'image/jpeg' });

    await new BrowserProjectThumbnailRenderer(fixture.runtime).render(source, null);

    expect(fixture.decode).toHaveBeenCalledWith(source, true);
    expect(fixture.createCanvas).toHaveBeenCalledWith(400, 300);
    expect(fixture.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
  });
});
