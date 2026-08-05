import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';
import { ProjectMigrator } from '@/contexts/projects/infrastructure/migrations/ProjectMigrator';
import { VersionZeroToOneProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionZeroToOneProjectMigration';
import { VersionOneToTwoProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionOneToTwoProjectMigration';
import { VersionTwoToThreeProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionTwoToThreeProjectMigration';
import { VersionThreeToFourProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionThreeToFourProjectMigration';
import { VersionFourToFiveProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionFourToFiveProjectMigration';
import { VersionFiveToSixProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionFiveToSixProjectMigration';
import { VersionSixToSevenProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionSixToSevenProjectMigration';
import { photoProjectSchema } from '@/contexts/projects/infrastructure/serialization/ProjectSchemas';

describe('ProjectMigrator', () => {
  const migrator = new ProjectMigrator([
    new VersionZeroToOneProjectMigration(),
    new VersionOneToTwoProjectMigration(),
    new VersionTwoToThreeProjectMigration(),
    new VersionThreeToFourProjectMigration(),
    new VersionFourToFiveProjectMigration(),
    new VersionFiveToSixProjectMigration(),
    new VersionSixToSevenProjectMigration()
  ]);

  it('migrates a demo project from schema 0 to the current schema', () => {
    const current = PhotoProjectMother.create().toPrimitives();
    const legacy = { ...current, schemaVersion: 0 };
    delete (legacy as Partial<typeof legacy>).uiState;
    const migrated = photoProjectSchema.parse(migrator.migrate(legacy));
    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.uiState.mode).toBe('simple');
    expect(migrated.recipe.disabledGlobalAdjustments).toEqual([]);
    expect(migrated.recipe.globalAdjustments.texture).toBe(0);
    expect(migrated.recipe.globalAdjustments.vignette).toBe(0);
    expect(migrated.organization).toEqual({ rating: 0, tags: [], favorite: false });
    expect(migrated.recipe.viewport).toMatchObject({ horizontalPerspective: 0, verticalPerspective: 0 });
    expect(Object.values(migrated.captureMetadata)).toEqual(Array(14).fill(null));
  });

  it('rejects future versions', () => {
    expect(() => migrator.migrate({ schemaVersion: 99 })).toThrow(/unsupported future schema/);
  });

  it('adds neutral perspective to recipes and recorded viewport history from schema 6', () => {
    const current = PhotoProjectMother.create().toPrimitives();
    const viewport = { ...current.recipe.viewport };
    delete (viewport as Partial<typeof viewport>).horizontalPerspective;
    delete (viewport as Partial<typeof viewport>).verticalPerspective;
    const operation = { kind: 'set-viewport-transform', viewport, groupId: null };
    const legacy = {
      ...current,
      schemaVersion: 6,
      recipe: { ...current.recipe, viewport },
      history: { ...current.history, undo: [{ operation, inverse: operation }], redo: [] }
    };

    const migrated = photoProjectSchema.parse(new VersionSixToSevenProjectMigration().migrate(legacy));

    expect(migrated.recipe.viewport).toMatchObject({ horizontalPerspective: 0, verticalPerspective: 0 });
    expect(migrated.history.undo[0]?.operation).toMatchObject({
      kind: 'set-viewport-transform',
      viewport: { horizontalPerspective: 0, verticalPerspective: 0 }
    });
  });
});
