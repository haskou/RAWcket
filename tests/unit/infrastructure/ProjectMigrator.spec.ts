import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';
import { ProjectMigrator } from '@/contexts/projects/infrastructure/migrations/ProjectMigrator';
import { VersionZeroToOneProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionZeroToOneProjectMigration';
import { photoProjectSchema } from '@/contexts/projects/infrastructure/serialization/ProjectSchemas';

describe('ProjectMigrator', () => {
  const migrator = new ProjectMigrator([new VersionZeroToOneProjectMigration()]);

  it('migra un proyecto de demostracion desde schema 0 hasta el actual', () => {
    const current = PhotoProjectMother.create().toPrimitives();
    const legacy = { ...current, schemaVersion: 0 };
    delete (legacy as Partial<typeof legacy>).uiState;
    const migrated = photoProjectSchema.parse(migrator.migrate(legacy));
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.uiState.mode).toBe('simple');
  });

  it('rechaza versiones futuras', () => {
    expect(() => migrator.migrate({ schemaVersion: 99 })).toThrow(/futuro no compatible/);
  });
});
