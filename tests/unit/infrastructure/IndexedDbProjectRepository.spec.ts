import { deleteDB } from 'idb';
import { Timestamp } from '@haskou/value-objects';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
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
import { IndexedDbProjectRepository } from '@/contexts/projects/infrastructure/repositories/IndexedDbProjectRepository';
import { RawcketDatabase } from '@/shared/infrastructure/database/RawcketDatabase';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('IndexedDbProjectRepository', () => {
  it('persists, lists, hydrates, and deletes aggregates', async () => {
    const databaseName = `rawcket-projects-${crypto.randomUUID()}`;
    const connection = RawcketDatabase.open(databaseName);
    const repository = new IndexedDbProjectRepository(
      connection,
      new ProjectMigrator([new VersionZeroToOneProjectMigration(), new VersionOneToTwoProjectMigration(), new VersionTwoToThreeProjectMigration(), new VersionThreeToFourProjectMigration(), new VersionFourToFiveProjectMigration(), new VersionFiveToSixProjectMigration(), new VersionSixToSevenProjectMigration(), new VersionSevenToEightProjectMigration(), new VersionEightToNineProjectMigration()])
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

  it('recovers the newest valid snapshot when the current project record is corrupt', async () => {
    const databaseName = `rawcket-project-recovery-${crypto.randomUUID()}`;
    const connection = RawcketDatabase.open(databaseName);
    const repository = new IndexedDbProjectRepository(
      connection,
      new ProjectMigrator([new VersionZeroToOneProjectMigration(), new VersionOneToTwoProjectMigration(), new VersionTwoToThreeProjectMigration(), new VersionThreeToFourProjectMigration(), new VersionFourToFiveProjectMigration(), new VersionFiveToSixProjectMigration(), new VersionSixToSevenProjectMigration(), new VersionSevenToEightProjectMigration(), new VersionEightToNineProjectMigration()])
    );
    const project = PhotoProjectMother.create();

    await repository.save(project);
    project.apply({
      kind: EDIT_OPERATION.RENAME_PROJECT,
      name: 'Updated project',
      groupId: null
    }, Timestamp.new(1_750_000_001_000));
    await repository.save(project);

    const database = await connection;
    await database.put('projects', { corrupted: true }, project.getId().valueOf());

    const recovered = await repository.findById(project.getId());
    expect(recovered?.getName().valueOf()).toBe('Test project');

    database.close();
    await deleteDB(databaseName);
  });

  it('retains only the five newest snapshots per project', async () => {
    const databaseName = `rawcket-project-snapshots-${crypto.randomUUID()}`;
    const connection = RawcketDatabase.open(databaseName);
    const repository = new IndexedDbProjectRepository(
      connection,
      new ProjectMigrator([new VersionZeroToOneProjectMigration(), new VersionOneToTwoProjectMigration(), new VersionTwoToThreeProjectMigration(), new VersionThreeToFourProjectMigration(), new VersionFourToFiveProjectMigration(), new VersionFiveToSixProjectMigration(), new VersionSixToSevenProjectMigration(), new VersionSevenToEightProjectMigration(), new VersionEightToNineProjectMigration()])
    );
    const project = PhotoProjectMother.create();

    await repository.save(project);
    for (let index = 1; index <= 7; index += 1) {
      project.apply({
        kind: EDIT_OPERATION.RENAME_PROJECT,
        name: `Project version ${index}`,
        groupId: null
      }, Timestamp.new(1_750_000_000_000 + index));
      await repository.save(project);
    }

    const database = await connection;
    const snapshots = await database.getAllFromIndex('projectSnapshots', 'by-project', project.getId().valueOf());
    expect(snapshots).toHaveLength(5);

    database.close();
    await deleteDB(databaseName);
  });
});
