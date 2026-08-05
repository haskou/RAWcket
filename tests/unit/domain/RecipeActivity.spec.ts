import { Timestamp } from '@haskou/value-objects';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { AdjustmentKey } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('Active recipe state', () => {
  it('treats reset global values as inactive recipe instructions', () => {
    const project = PhotoProjectMother.create();

    expect(project.isGlobalAdjustmentModified(AdjustmentKey.EXPOSURE)).toBe(false);
    project.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'exposure', value: 1, groupId: null }, Timestamp.new(1_750_000_000_001));
    expect(project.isGlobalAdjustmentModified(AdjustmentKey.EXPOSURE)).toBe(true);
    project.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'exposure', value: 0, groupId: null }, Timestamp.new(1_750_000_000_002));
    expect(project.isGlobalAdjustmentModified(AdjustmentKey.EXPOSURE)).toBe(false);
  });

  it('reports only non-neutral curve, geometry, and mask blocks', () => {
    const project = PhotoProjectMother.create();
    expect(project.hasCurveAdjustments()).toBe(false);
    expect(project.hasGeometryAdjustments()).toBe(false);
    expect(project.hasMasks()).toBe(false);

    project.apply({
      kind: EDIT_OPERATION.SET_CURVE,
      channel: 'rgb',
      curve: { points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.6 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
      groupId: null
    }, Timestamp.new(1_750_000_000_001));
    project.apply({
      kind: EDIT_OPERATION.SET_VIEWPORT_TRANSFORM,
      viewport: {
        cropFrame: { x: 0, y: 0, width: 1, height: 1 },
        translation: { x: 0.5, y: 0.5 },
        scale: 1,
        rotationDegrees: 1,
        flipHorizontal: false,
        flipVertical: false,
        aspectRatio: null
      },
      groupId: null
    }, Timestamp.new(1_750_000_000_002));

    expect(project.hasCurveAdjustments()).toBe(true);
    expect(project.hasGeometryAdjustments()).toBe(true);
  });
});
