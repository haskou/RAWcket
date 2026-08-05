import { Timestamp } from '@haskou/value-objects';
import { ApplyProjectSidecar } from '@/contexts/projects/application/apply-project-sidecar/ApplyProjectSidecar';
import { ApplyProjectSidecarMessage } from '@/contexts/projects/application/apply-project-sidecar/messages/ApplyProjectSidecarMessage';
import { ExportProjectSidecar } from '@/contexts/projects/application/export-project-sidecar/ExportProjectSidecar';
import { ExportProjectSidecarMessage } from '@/contexts/projects/application/export-project-sidecar/messages/ExportProjectSidecarMessage';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { AdjustmentKey } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { JsonProjectSidecarCodec } from '@/contexts/projects/infrastructure/sidecars/JsonProjectSidecarCodec';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('Project sidecar workflow', () => {
  it('exports and applies a versioned recipe as one undoable operation', async () => {
    const project = PhotoProjectMother.create();
    project.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'exposure', value: 1, groupId: null }, Timestamp.new(1_750_000_000_001));
    const codec = new JsonProjectSidecarCodec();
    const sidecar = new ExportProjectSidecar(codec).export(project, new ExportProjectSidecarMessage(project.getId().valueOf()));
    project.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'exposure', value: 2, groupId: null }, Timestamp.new(1_750_000_000_002));

    await new ApplyProjectSidecar(codec).apply(project, new ApplyProjectSidecarMessage(project.getId().valueOf(), sidecar, 1_750_000_000_003));

    expect(project.getGlobalAdjustment(AdjustmentKey.EXPOSURE).valueOf()).toBe(1);
    expect(project.undo(Timestamp.new(1_750_000_000_004))).toBe(true);
    expect(project.getGlobalAdjustment(AdjustmentKey.EXPOSURE).valueOf()).toBe(2);
  });

  it('rejects malformed sidecars with an actionable error', async () => {
    await expect(new JsonProjectSidecarCodec().decode(new Blob(['{}']))).rejects.toThrow(/valid RAWcket recipe sidecar/);
  });

  it('keeps older sidecars neutral when perspective fields are absent', async () => {
    const project = PhotoProjectMother.create().toPrimitives();
    const recipe = structuredClone(project.recipe);
    delete (recipe.viewport as Partial<typeof recipe.viewport>).horizontalPerspective;
    delete (recipe.viewport as Partial<typeof recipe.viewport>).verticalPerspective;
    const sidecar = new Blob([JSON.stringify({
      format: 'rawcket-sidecar',
      formatVersion: 1,
      projectSchemaVersion: 6,
      source: { fileName: project.source.fileName, width: project.metadata.width, height: project.metadata.height },
      recipe
    })], { type: 'application/json' });

    await expect(new JsonProjectSidecarCodec().decode(sidecar)).resolves.toMatchObject({
      viewport: { horizontalPerspective: 0, verticalPerspective: 0 }
    });
  });
});
