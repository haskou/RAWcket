import { CropFrameProjector } from '@/presentation/editor/CropFrameProjector';

describe('CropFrameProjector', () => {
  it('draws a free crop without imposing an image or preset ratio', () => {
    const crop = CropFrameProjector.draw(
      { x: 0.1, y: 0.2 },
      { x: 0.8, y: 0.45 },
      null,
      { width: 3_000, height: 2_000 }
    );

    expect(crop).toMatchObject({ x: 0.1, y: 0.2, height: 0.25 });
    expect(crop.width).toBeCloseTo(0.7);
  });

  it('projects a locked photographic ratio into normalized image coordinates', () => {
    const crop = CropFrameProjector.draw(
      { x: 0.2, y: 0.2 },
      { x: 0.7, y: 0.8 },
      { width: 1, height: 1 },
      { width: 2_000, height: 1_000 }
    );

    expect(crop.width / crop.height).toBeCloseTo(0.5);
  });

  it('moves an existing crop without changing its size and stops at image edges', () => {
    const crop = CropFrameProjector.move(
      { x: 0.2, y: 0.25, width: 0.4, height: 0.5 },
      { x: 0.3, y: 0.4 },
      { x: 0.95, y: 0.95 }
    );

    expect(crop).toEqual({ x: 0.6, y: 0.5, width: 0.4, height: 0.5 });
  });
});
