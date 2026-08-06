import { MaskCompositionOperation } from '@/contexts/projects/domain/value-objects/MaskCompositionOperation';

describe('MaskCompositionOperation', () => {
  it('hydrates each supported boolean operation with semantic predicates', () => {
    expect(MaskCompositionOperation.fromPrimitives('add').isAdd()).toBe(true);
    expect(MaskCompositionOperation.fromPrimitives('subtract').isSubtract()).toBe(true);
    expect(MaskCompositionOperation.fromPrimitives('intersect').isAdd()).toBe(false);
  });

  it('rejects unsupported operations', () => {
    expect(() => MaskCompositionOperation.fromPrimitives('replace' as 'add')).toThrow();
  });
});
