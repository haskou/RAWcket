import { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import { Timestamp } from '@haskou/value-objects';
import { photoProjectSchema } from '@/contexts/projects/infrastructure/serialization/ProjectSchemas';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('PhotoProject serialization', () => {
  it('validates and hydrates the persistence contract without losing identity', () => {
    const original = PhotoProjectMother.create();
    const serialized = photoProjectSchema.parse(original.toPrimitives());
    const hydrated = PhotoProject.fromPrimitives(serialized);
    expect(hydrated.isIdentifiedBy(original.getId())).toBe(true);
    expect(hydrated.getName().isEqual(original.getName())).toBe(true);
  });

  it('persists boolean mask composition operations in history', () => {
    const original = PhotoProjectMother.create();
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();
    const mask = (id: string): MaskDefinitionPrimitives => ({
      id, enabled: true, inverted: false, opacity: 1, feather: 0, density: 1, expansion: 0,
      localAdjustments: { exposure: 0.5 },
      shape: { kind: 'radial' as const, center: { x: 0.5, y: 0.5 }, radiusX: 0.2, radiusY: 0.2, rotationDegrees: 0 }
    });
    original.apply({ kind: EDIT_OPERATION.ADD_MASK, mask: mask(firstId), groupId: null }, Timestamp.now());
    original.apply({ kind: EDIT_OPERATION.ADD_MASK, mask: mask(secondId), groupId: null }, Timestamp.now());
    original.apply({
      kind: EDIT_OPERATION.COMPOSE_MASKS,
      compositeMaskId: crypto.randomUUID(),
      maskIds: [firstId, secondId],
      operation: 'intersect',
      groupId: null
    }, Timestamp.now());

    const serialized = photoProjectSchema.parse(original.toPrimitives());

    expect(serialized.history.undo.at(-1)?.operation).toMatchObject({ kind: 'compose-masks', operation: 'intersect' });
    expect(PhotoProject.fromPrimitives(serialized).getMasks()[0]?.isComposite()).toBe(true);
  });
});
