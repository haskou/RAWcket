import { Timestamp } from '@haskou/value-objects';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import { AdjustmentKey } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { GlobalAdjustmentValue } from '@/contexts/projects/domain/value-objects/GlobalAdjustmentValue';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('PhotoProject edit history', () => {
  it('groups continuous edits into one undo action and keeps redo after hydration', () => {
    const project = PhotoProjectMother.create();
    project.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'exposure', value: 1, groupId: 'drag-1' }, Timestamp.now());
    project.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'exposure', value: 2, groupId: 'drag-1' }, Timestamp.now());

    expect(project.undo(Timestamp.now())).toBe(true);
    expect(project.getGlobalAdjustment(AdjustmentKey.EXPOSURE).isEqual(
      GlobalAdjustmentValue.for(AdjustmentKey.EXPOSURE, 0)
    )).toBe(true);

    const restored = PhotoProject.fromPrimitives(project.toPrimitives());
    expect(restored.redo(Timestamp.now())).toBe(true);
    expect(restored.getGlobalAdjustment(AdjustmentKey.EXPOSURE).isEqual(
      GlobalAdjustmentValue.for(AdjustmentKey.EXPOSURE, 2)
    )).toBe(true);
  });

  it('disables an adjustment without losing its value and restores enabled state through undo', () => {
    const project = PhotoProjectMother.create();
    project.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'exposure', value: 1.25, groupId: null }, Timestamp.now());
    project.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT_ENABLED, key: 'exposure', enabled: false, groupId: null }, Timestamp.now());

    expect(project.isGlobalAdjustmentEnabled(AdjustmentKey.EXPOSURE)).toBe(false);
    expect(project.getGlobalAdjustment(AdjustmentKey.EXPOSURE).isEqual(
      GlobalAdjustmentValue.for(AdjustmentKey.EXPOSURE, 1.25)
    )).toBe(true);

    expect(project.undo(Timestamp.now())).toBe(true);
    expect(project.isGlobalAdjustmentEnabled(AdjustmentKey.EXPOSURE)).toBe(true);
    expect(project.getGlobalAdjustment(AdjustmentKey.EXPOSURE).isEqual(
      GlobalAdjustmentValue.for(AdjustmentKey.EXPOSURE, 1.25)
    )).toBe(true);
  });
});
