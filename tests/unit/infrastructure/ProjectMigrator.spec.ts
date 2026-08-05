import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';
import { ProjectMigrator } from '@/contexts/projects/infrastructure/migrations/ProjectMigrator';
import { VersionZeroToOneProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionZeroToOneProjectMigration';
import { VersionOneToTwoProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionOneToTwoProjectMigration';
import { VersionTwoToThreeProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionTwoToThreeProjectMigration';
import { photoProjectSchema } from '@/contexts/projects/infrastructure/serialization/ProjectSchemas';

describe('ProjectMigrator', () => {
  const migrator = new ProjectMigrator([
    new VersionZeroToOneProjectMigration(),
    new VersionOneToTwoProjectMigration(),
    new VersionTwoToThreeProjectMigration()
  ]);

  it('migrates a demo project from schema 0 to the current schema', () => {
    const current = PhotoProjectMother.create().toPrimitives();
    const legacy = { ...current, schemaVersion: 0 };
    delete (legacy as Partial<typeof legacy>).uiState;
    const migrated = photoProjectSchema.parse(migrator.migrate(legacy));
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.uiState.mode).toBe('simple');
    expect(migrated.recipe.disabledGlobalAdjustments).toEqual([]);
    expect(migrated.recipe.globalAdjustments.texture).toBe(0);
    expect(migrated.recipe.globalAdjustments.vignette).toBe(0);
  });

  it('rejects future versions', () => {
    expect(() => migrator.migrate({ schemaVersion: 99 })).toThrow(/unsupported future schema/);
  });
});
