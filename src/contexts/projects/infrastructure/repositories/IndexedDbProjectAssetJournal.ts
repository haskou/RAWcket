import { Timestamp } from '@haskou/value-objects';
import { PendingProjectAssetMutation, ProjectAssetMutationKind, type ProjectAssetJournal } from '../../application/ports/ProjectAssetJournal';
import { ProjectId } from '../../domain/value-objects/ProjectId';
import type { RawcketDatabaseConnection } from '../../../../shared/infrastructure/database/RawcketDatabase';

export class IndexedDbProjectAssetJournal implements ProjectAssetJournal {
  public constructor(private readonly database: Promise<RawcketDatabaseConnection>) {}
  public async begin(projectId: ProjectId, kind: ProjectAssetMutationKind, startedAt: Timestamp): Promise<void> {
    await (await this.database).put('projectAssetJournal', {
      projectId: projectId.valueOf(),
      kind: kind.valueOf(),
      startedAt: startedAt.toMilliseconds()
    });
  }
  public async complete(projectId: ProjectId): Promise<void> {
    await (await this.database).delete('projectAssetJournal', projectId.valueOf());
  }
  public async findPending(): Promise<PendingProjectAssetMutation[]> {
    const records = await (await this.database).getAll('projectAssetJournal');
    return records.map((record) => new PendingProjectAssetMutation(
      new ProjectId(record.projectId),
      ProjectAssetMutationKind.fromPrimitives(record.kind),
      Timestamp.new(record.startedAt)
    ));
  }
}
