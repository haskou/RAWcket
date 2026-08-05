import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';
import { ProjectMigrator } from '@/contexts/projects/infrastructure/migrations/ProjectMigrator';
import { VersionZeroToOneProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionZeroToOneProjectMigration';
import { VersionOneToTwoProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionOneToTwoProjectMigration';
import { VersionTwoToThreeProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionTwoToThreeProjectMigration';
import { VersionThreeToFourProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionThreeToFourProjectMigration';
import { VersionFourToFiveProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionFourToFiveProjectMigration';
import { VersionFiveToSixProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionFiveToSixProjectMigration';
import { VersionSixToSevenProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionSixToSevenProjectMigration';
import { VersionSevenToEightProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionSevenToEightProjectMigration';
import { VersionEightToNineProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionEightToNineProjectMigration';
import { photoProjectSchema } from '@/contexts/projects/infrastructure/serialization/ProjectSchemas';

describe('ProjectMigrator', () => {
  const migrator = new ProjectMigrator([
    new VersionZeroToOneProjectMigration(),
    new VersionOneToTwoProjectMigration(),
    new VersionTwoToThreeProjectMigration(),
    new VersionThreeToFourProjectMigration(),
    new VersionFourToFiveProjectMigration(),
    new VersionFiveToSixProjectMigration(),
    new VersionSixToSevenProjectMigration(),
    new VersionSevenToEightProjectMigration(),
    new VersionEightToNineProjectMigration()
  ]);

  it('migrates a demo project from schema 0 to the current schema', () => {
    const current = PhotoProjectMother.create().toPrimitives();
    const legacy = { ...current, schemaVersion: 0 };
    delete (legacy as Partial<typeof legacy>).uiState;
    const migrated = photoProjectSchema.parse(migrator.migrate(legacy));
    expect(migrated.schemaVersion).toBe(9);
    expect(migrated.uiState.mode).toBe('simple');
    expect(migrated.recipe.disabledGlobalAdjustments).toEqual([]);
    expect(migrated.recipe.globalAdjustments.texture).toBe(0);
    expect(migrated.recipe.globalAdjustments.vignette).toBe(0);
    expect(migrated.organization).toEqual({ rating: 0, tags: [], favorite: false });
    expect(migrated.recipe.viewport).toMatchObject({ horizontalPerspective: 0, verticalPerspective: 0 });
    expect(Object.values(migrated.captureMetadata)).toEqual(Array(14).fill(null));
    expect(migrated.aiDevelopment).toEqual({ advice: [] });
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

  it('migrates brush add semantics, full pressure, and neutral expansion from schema 7', () => {
    const current = PhotoProjectMother.create().toPrimitives();
    const mask = {
      id: crypto.randomUUID(), enabled: true, inverted: false, opacity: 1, feather: 0, density: 1,
      localAdjustments: {}, shape: { kind: 'brush', strokes: [{ points: [{ x: 0.5, y: 0.5 }], size: 0.1, hardness: 1, flow: 1 }] }
    };
    const operation = { kind: 'add-mask', mask, groupId: null };
    const legacy = {
      ...current,
      schemaVersion: 7,
      recipe: { ...current.recipe, masks: [mask] },
      history: { ...current.history, undo: [{ operation, inverse: { kind: 'remove-mask', maskId: mask.id, groupId: null } }], redo: [] }
    };

    const migrated = photoProjectSchema.parse(new VersionSevenToEightProjectMigration().migrate(legacy));
    const brush = migrated.recipe.masks[0];
    expect(brush).toMatchObject({ expansion: 0, shape: { kind: 'brush', strokes: [{ mode: 'add', points: [{ pressure: 1 }] }] } });
    expect(migrated.history.undo[0]?.operation).toMatchObject({ kind: 'add-mask', mask: { expansion: 0 } });
  });

  it('adds an empty AI development journal to schema 8 projects', () => {
    const legacy = { ...PhotoProjectMother.create().toPrimitives(), schemaVersion: 8 };
    delete (legacy as Partial<typeof legacy>).aiDevelopment;

    const migrated = photoProjectSchema.parse(new VersionEightToNineProjectMigration().migrate(legacy));

    expect(migrated).toMatchObject({ schemaVersion: 9, aiDevelopment: { advice: [] } });
  });
});
