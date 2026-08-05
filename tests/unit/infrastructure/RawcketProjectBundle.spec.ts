import { RawcketProjectBundle } from '@/contexts/projects/infrastructure/bundles/RawcketProjectBundle';
import { ProjectMigrator } from '@/contexts/projects/infrastructure/migrations/ProjectMigrator';
import { VersionZeroToOneProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionZeroToOneProjectMigration';
import { InMemoryProjectRepository } from '@/contexts/projects/infrastructure/repositories/InMemoryProjectRepository';
import { InMemorySourceFileRepository } from '@/contexts/projects/infrastructure/repositories/InMemorySourceFileRepository';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('RawcketProjectBundle', () => {
  it('exporta e importa project.json, manifest e imagen con integridad SHA-256', async () => {
    const projects = new InMemoryProjectRepository();
    const sources = new InMemorySourceFileRepository();
    const bundle = new RawcketProjectBundle(
      projects,
      sources,
      new ProjectMigrator([new VersionZeroToOneProjectMigration()])
    );
    const project = PhotoProjectMother.create();
    await projects.save(project);
    await sources.save(project.getId(), new Blob(['jpg'], { type: 'image/jpeg' }));

    const exported = await bundle.exportProject(project.getId());
    const importedId = await bundle.importProject(exported);

    expect(importedId.isNotEqual(project.getId())).toBe(true);
    expect(await projects.findById(importedId)).not.toBeNull();
    expect(await sources.find(importedId)).not.toBeNull();
  });

  it('rechaza bytes que no forman un bundle', async () => {
    const projects = new InMemoryProjectRepository();
    const sources = new InMemorySourceFileRepository();
    const bundle = new RawcketProjectBundle(projects, sources, new ProjectMigrator([]));
    await expect(bundle.importProject(new Blob(['no-es-zip']))).rejects.toThrow(/no es un bundle/);
  });
});
