import { Timestamp } from '@haskou/value-objects';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import { AdjustmentKey } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { GlobalAdjustmentValue } from '@/contexts/projects/domain/value-objects/GlobalAdjustmentValue';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('PhotoProject edit history', () => {
  it('agrupa cambios continuos en una accion de undo y conserva redo al restaurar', () => {
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
});
