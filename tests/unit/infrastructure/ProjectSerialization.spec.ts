import { PhotoProject, type PhotoProjectPrimitives } from '@/contexts/projects/domain/PhotoProject';
import { photoProjectSchema } from '@/contexts/projects/infrastructure/serialization/ProjectSchemas';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('serializacion de PhotoProject', () => {
  it('valida e hidrata el contrato persistente sin perder identidad', () => {
    const original = PhotoProjectMother.create();
    const serialized = photoProjectSchema.parse(original.toPrimitives());
    const hydrated = PhotoProject.fromPrimitives(serialized as PhotoProjectPrimitives);
    expect(hydrated.isIdentifiedBy(original.getId())).toBe(true);
    expect(hydrated.getName().isEqual(original.getName())).toBe(true);
  });
});
