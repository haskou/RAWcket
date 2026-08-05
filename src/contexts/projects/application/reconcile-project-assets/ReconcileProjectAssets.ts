import type { Queue } from '@haskou/flow';
import type { ProjectAssetJournal } from '../ports/ProjectAssetJournal';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';

export type ProjectAssetReconciliation = {
  recoveredMutations: number;
  removedOrphanedSources: number;
  missingReferencedSources: number;
};

export class ReconcileProjectAssets {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly sources: SourceFileRepository,
    private readonly journal: ProjectAssetJournal,
    private readonly queue: Queue
  ) {}

  public reconcile(): Promise<ProjectAssetReconciliation> {
    return this.queue.run(async () => {
      const result: ProjectAssetReconciliation = { recoveredMutations: 0, removedOrphanedSources: 0, missingReferencedSources: 0 };
      for (const mutation of await this.journal.findPending()) {
        const project = await this.projects.findById(mutation.getProjectId());
        const source = await this.sources.find(mutation.getProjectId());
        if (mutation.getKind().isCreate()) {
          if (project === null) {
            if (source !== null) {
              await this.sources.delete(mutation.getProjectId());
              result.removedOrphanedSources += 1;
            }
            await this.journal.complete(mutation.getProjectId());
            result.recoveredMutations += 1;
          } else if (source !== null) {
            await this.journal.complete(mutation.getProjectId());
            result.recoveredMutations += 1;
          } else result.missingReferencedSources += 1;
          continue;
        }
        if (project === null) {
          if (source !== null) {
            await this.sources.delete(mutation.getProjectId());
            result.removedOrphanedSources += 1;
          }
        }
        await this.journal.complete(mutation.getProjectId());
        result.recoveredMutations += 1;
      }
      return result;
    });
  }
}
