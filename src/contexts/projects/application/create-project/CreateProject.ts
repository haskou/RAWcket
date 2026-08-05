import { Timestamp } from '@haskou/value-objects';
import type { Queue } from '@haskou/flow';
import { PhotoProject } from '../../domain/PhotoProject';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import type { CreateProjectMessage } from './messages/CreateProjectMessage';
import { ProjectAssetMutationKind, type ProjectAssetJournal } from '../ports/ProjectAssetJournal';

export class CreateProject {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly sourceFiles: SourceFileRepository,
    private readonly journal: ProjectAssetJournal,
    private readonly queue: Queue
  ) {}

  public async create(message: CreateProjectMessage): Promise<PhotoProject> {
    return this.queue.run(async () => {
      await this.journal.begin(message.getProjectId(), ProjectAssetMutationKind.CREATE, Timestamp.now());
      let sourceWasSaved = false;
      try {
        const stored = await this.sourceFiles.save(message.getProjectId(), message.getFile());
        sourceWasSaved = true;
        const project = PhotoProject.create(
          message.getProjectId(),
          message.getProjectName(),
          message.createSourceReference(stored.getStorageKey()),
          message.createMetadata(),
          message.createCaptureMetadata()
        );
        await this.projects.save(project);
        try { await this.journal.complete(message.getProjectId()); } catch { /* Reconciliation safely finishes the committed create. */ }
        return project;
      } catch (error: unknown) {
        try {
          if (sourceWasSaved) await this.sourceFiles.delete(message.getProjectId());
          await this.journal.complete(message.getProjectId());
        } catch { /* Keep the journal entry so startup reconciliation can finish cleanup. */ }
        throw error;
      }
    });
  }
}
