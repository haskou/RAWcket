import { Timestamp } from '@haskou/value-objects';
import type { Queue } from '@haskou/flow';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import type { DeleteProjectMessage } from './messages/DeleteProjectMessage';
import { ProjectAssetMutationKind, type ProjectAssetJournal } from '../ports/ProjectAssetJournal';

export class DeleteProject {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly sourceFiles: SourceFileRepository,
    private readonly journal: ProjectAssetJournal,
    private readonly queue: Queue
  ) {}
  public async delete(message: DeleteProjectMessage): Promise<void> {
    await this.queue.run(async () => {
      await this.journal.begin(message.getProjectId(), ProjectAssetMutationKind.DELETE, Timestamp.now());
      try {
        await this.projects.delete(message.getProjectId());
      } catch (error: unknown) {
        await this.journal.complete(message.getProjectId());
        throw error;
      }
      await this.sourceFiles.delete(message.getProjectId());
      await this.journal.complete(message.getProjectId());
    });
  }
}
