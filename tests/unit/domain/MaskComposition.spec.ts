import { Timestamp } from '@haskou/value-objects';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { MaskDefinition, type MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import { MaskId } from '@/contexts/projects/domain/value-objects/MaskId';
import { MaskCompositionOperation } from '@/contexts/projects/domain/value-objects/MaskCompositionOperation';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

function radialMask(id = crypto.randomUUID(), exposure = 0.5): MaskDefinitionPrimitives {
  return {
    id,
    enabled: true,
    inverted: false,
    opacity: 0.8,
    feather: 0.25,
    density: 0.9,
    expansion: 0.02,
    localAdjustments: { exposure },
    shape: { kind: 'radial', center: { x: 0.5, y: 0.5 }, radiusX: 0.2, radiusY: 0.3, rotationDegrees: 0 }
  };
}

describe('Mask composition', () => {
  it('creates a neutral parent with primary adjustments and intact ordered children', () => {
    const first = MaskDefinition.fromPrimitives(radialMask(crypto.randomUUID(), 1.25));
    const second = MaskDefinition.fromPrimitives(radialMask());
    const composite = MaskDefinition.compose(
      new MaskId(crypto.randomUUID()),
      MaskCompositionOperation.SUBTRACT,
      [first, second]
    );

    expect(composite.isComposite()).toBe(true);
    expect(composite.toPrimitives()).toMatchObject({
      enabled: true,
      inverted: false,
      opacity: 1,
      feather: 0,
      density: 1,
      expansion: 0,
      localAdjustments: { exposure: 1.25 },
      shape: { kind: 'composite', operation: 'subtract' }
    });
    const released = composite.releaseComposition();
    expect(released[0]?.isIdentifiedBy(first.getId())).toBe(true);
    expect(released[1]?.isIdentifiedBy(second.getId())).toBe(true);
  });

  it('composes ordered top-level masks as one undoable and redoable project operation', () => {
    const project = PhotoProjectMother.create();
    const first = radialMask();
    const untouched = radialMask();
    const primary = radialMask(crypto.randomUUID(), 1.5);
    [first, untouched, primary].forEach((mask) => project.apply({ kind: EDIT_OPERATION.ADD_MASK, mask, groupId: null }, Timestamp.now()));
    const beforeComposition = project.getMasks();
    const compositeMaskId = crypto.randomUUID();

    project.apply({
      kind: EDIT_OPERATION.COMPOSE_MASKS,
      compositeMaskId,
      maskIds: [primary.id, first.id],
      operation: 'subtract',
      groupId: null
    }, Timestamp.now());

    const composed = project.getMasks();
    expect(composed).toHaveLength(2);
    expect(composed[0]?.isIdentifiedBy(new MaskId(untouched.id))).toBe(true);
    expect(composed[1]?.isIdentifiedBy(new MaskId(compositeMaskId))).toBe(true);
    expect(composed[1]?.toPrimitives()).toMatchObject({
      localAdjustments: { exposure: 1.5 },
      shape: { kind: 'composite', operation: 'subtract', children: [{ id: primary.id }, { id: first.id }] }
    });

    expect(project.undo(Timestamp.now())).toBe(true);
    expect(project.getMasks().map((mask) => mask.toPrimitives())).toEqual(beforeComposition.map((mask) => mask.toPrimitives()));
    expect(project.redo(Timestamp.now())).toBe(true);
    expect(project.getMasks()[1]?.isIdentifiedBy(new MaskId(compositeMaskId))).toBe(true);
  });

  it('releases child masks as one reversible operation', () => {
    const project = PhotoProjectMother.create();
    const first = radialMask();
    const second = radialMask();
    project.apply({ kind: EDIT_OPERATION.ADD_MASK, mask: first, groupId: null }, Timestamp.now());
    project.apply({ kind: EDIT_OPERATION.ADD_MASK, mask: second, groupId: null }, Timestamp.now());
    const compositeMaskId = crypto.randomUUID();
    project.apply({ kind: EDIT_OPERATION.COMPOSE_MASKS, compositeMaskId, maskIds: [first.id, second.id], operation: 'add', groupId: null }, Timestamp.now());

    project.apply({ kind: EDIT_OPERATION.DECOMPOSE_MASK, compositeMaskId, groupId: null }, Timestamp.now());

    expect(project.getMasks().map((mask) => mask.toPrimitives())).toEqual([first, second]);
    expect(project.undo(Timestamp.now())).toBe(true);
    expect(project.getMasks()[0]?.isIdentifiedBy(new MaskId(compositeMaskId))).toBe(true);
  });

  it('rejects duplicate, missing, and non-composite selections', () => {
    const project = PhotoProjectMother.create();
    const mask = radialMask();
    project.apply({ kind: EDIT_OPERATION.ADD_MASK, mask, groupId: null }, Timestamp.now());

    expect(() => project.apply({ kind: EDIT_OPERATION.COMPOSE_MASKS, compositeMaskId: crypto.randomUUID(), maskIds: [mask.id, mask.id], operation: 'add', groupId: null }, Timestamp.now())).toThrow(/only be selected once/);
    expect(() => project.apply({ kind: EDIT_OPERATION.COMPOSE_MASKS, compositeMaskId: crypto.randomUUID(), maskIds: [mask.id, crypto.randomUUID()], operation: 'add', groupId: null }, Timestamp.now())).toThrow(/does not exist/);
    expect(() => project.apply({ kind: EDIT_OPERATION.DECOMPOSE_MASK, compositeMaskId: mask.id, groupId: null }, Timestamp.now())).toThrow(/Only a composite mask/);
  });

  it('requires a composite identifier distinct from every child', () => {
    const first = MaskDefinition.fromPrimitives(radialMask());
    const second = MaskDefinition.fromPrimitives(radialMask());

    expect(() => MaskDefinition.compose(first.getId(), MaskCompositionOperation.ADD, [first, second])).toThrow(/new identifier/);
  });
});
