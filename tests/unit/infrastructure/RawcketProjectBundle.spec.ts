import { RawcketProjectBundle } from '@/contexts/projects/infrastructure/bundles/RawcketProjectBundle';
import { Queue, QueueOptions } from '@haskou/flow';
import type { ProjectAssetJournal } from '@/contexts/projects/application/ports/ProjectAssetJournal';
import { ProjectMigrator } from '@/contexts/projects/infrastructure/migrations/ProjectMigrator';
import { VersionZeroToOneProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionZeroToOneProjectMigration';
import { VersionOneToTwoProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionOneToTwoProjectMigration';
import { VersionTwoToThreeProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionTwoToThreeProjectMigration';
import { VersionThreeToFourProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionThreeToFourProjectMigration';
import { VersionFourToFiveProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionFourToFiveProjectMigration';
import { VersionFiveToSixProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionFiveToSixProjectMigration';
import { VersionSixToSevenProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionSixToSevenProjectMigration';
import { InMemoryProjectRepository } from '@/contexts/projects/infrastructure/repositories/InMemoryProjectRepository';
import { InMemorySourceFileRepository } from '@/contexts/projects/infrastructure/repositories/InMemorySourceFileRepository';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('RawcketProjectBundle', () => {
  const journal = (): ProjectAssetJournal => ({ begin: vi.fn(() => Promise.resolve()), complete: vi.fn(() => Promise.resolve()), findPending: vi.fn(() => Promise.resolve([])) });
  it('exports and imports project.json, manifest, and image with SHA-256 integrity', async () => {
    const projects = new InMemoryProjectRepository();
    const sources = new InMemorySourceFileRepository();
    const bundle = new RawcketProjectBundle(
      projects,
      sources,
      new ProjectMigrator([
        new VersionZeroToOneProjectMigration(),
        new VersionOneToTwoProjectMigration(),
        new VersionTwoToThreeProjectMigration(),
        new VersionThreeToFourProjectMigration(),
        new VersionFourToFiveProjectMigration(),
        new VersionFiveToSixProjectMigration(),
        new VersionSixToSevenProjectMigration()
      ]),
      journal(),
      new Queue(QueueOptions.withConcurrency(1))
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

  it('rejects bytes that do not form a bundle', async () => {
    const projects = new InMemoryProjectRepository();
    const sources = new InMemorySourceFileRepository();
    const bundle = new RawcketProjectBundle(projects, sources, new ProjectMigrator([]), journal(), new Queue(QueueOptions.withConcurrency(1)));
    await expect(bundle.importProject(new Blob(['not-a-zip']))).rejects.toThrow(/not a valid .rawcket bundle/);
  });
});
