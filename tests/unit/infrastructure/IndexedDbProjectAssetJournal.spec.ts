import { deleteDB } from 'idb';
import { Timestamp } from '@haskou/value-objects';
import { ProjectAssetMutationKind } from '@/contexts/projects/application/ports/ProjectAssetJournal';
import { ProjectId } from '@/contexts/projects/domain/value-objects/ProjectId';
import { IndexedDbProjectAssetJournal } from '@/contexts/projects/infrastructure/repositories/IndexedDbProjectAssetJournal';
import { RawcketDatabase } from '@/shared/infrastructure/database/RawcketDatabase';

describe('IndexedDbProjectAssetJournal', () => {
  it('persists and completes write-ahead mutations across database connections', async () => {
    const databaseName = `rawcket-journal-${crypto.randomUUID()}`;
    const connection = RawcketDatabase.open(databaseName);
    const journal = new IndexedDbProjectAssetJournal(connection);
    const projectId = new ProjectId(crypto.randomUUID());
    await journal.begin(projectId, ProjectAssetMutationKind.DELETE, Timestamp.new(1_750_000_000_000));

    const pending = await journal.findPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.getProjectId().isEqual(projectId)).toBe(true);
    expect(pending[0]?.getKind().isEqual(ProjectAssetMutationKind.DELETE)).toBe(true);

    await journal.complete(projectId);
    expect(await journal.findPending()).toEqual([]);
    (await connection).close();
    await deleteDB(databaseName);
  });
});
