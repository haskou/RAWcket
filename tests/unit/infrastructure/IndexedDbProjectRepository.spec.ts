import { deleteDB } from 'idb';
import { ProjectMigrator } from '@/contexts/projects/infrastructure/migrations/ProjectMigrator';
import { VersionZeroToOneProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionZeroToOneProjectMigration';
import { VersionOneToTwoProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionOneToTwoProjectMigration';
import { IndexedDbProjectRepository } from '@/contexts/projects/infrastructure/repositories/IndexedDbProjectRepository';
import { RawcketDatabase } from '@/shared/infrastructure/database/RawcketDatabase';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('IndexedDbProjectRepository', () => {
  it('persists, lists, hydrates, and deletes aggregates', async () => {
    const databaseName = `rawcket-projects-${crypto.randomUUID()}`;
    const connection = RawcketDatabase.open(databaseName);
    const repository = new IndexedDbProjectRepository(
      connection,
      new ProjectMigrator([new VersionZeroToOneProjectMigration(), new VersionOneToTwoProjectMigration()])
    );
    const project = PhotoProjectMother.create();

    await repository.save(project);
    const found = await repository.findById(project.getId());
    expect(found?.isIdentifiedBy(project.getId())).toBe(true);
    expect((await repository.findAll())[0]?.getName().isEqual(project.getName())).toBe(true);

    await repository.delete(project.getId());
    expect(await repository.findById(project.getId())).toBeNull();
    (await connection).close();
    await deleteDB(databaseName);
  });
});
