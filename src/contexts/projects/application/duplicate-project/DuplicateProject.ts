import { Timestamp } from '@haskou/value-objects';
import type { Queue } from '@haskou/flow';
import type { PhotoProject } from '../../domain/PhotoProject';
import { ProjectMetadata } from '../../domain/ProjectMetadata';
import { SourceImageReference } from '../../domain/SourceImageReference';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import { ProjectId } from '../../domain/value-objects/ProjectId';
import type { DuplicateProjectMessage } from './messages/DuplicateProjectMessage';
import { ProjectAssetMutationKind, type ProjectAssetJournal } from '../ports/ProjectAssetJournal';

export class DuplicateProject {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly sourceFiles: SourceFileRepository,
    private readonly journal: ProjectAssetJournal,
    private readonly queue: Queue
  ) {}
  public async duplicate(message: DuplicateProjectMessage): Promise<PhotoProject> {
    const original = await this.projects.findById(message.getProjectId());
    const source = await this.sourceFiles.find(message.getProjectId());
    if (original === null || source === null) throw new Error('An incomplete project cannot be duplicated.');
    const primitives = original.toPrimitives();
    const id = new ProjectId(crypto.randomUUID());
    return this.queue.run(async () => {
      await this.journal.begin(id, ProjectAssetMutationKind.CREATE, Timestamp.now());
      let sourceWasSaved = false;
      try {
        const stored = await this.sourceFiles.save(id, source);
        sourceWasSaved = true;
        const now = Timestamp.now();
        const project = original.duplicate(
          id,
          new SourceImageReference(
            original.getSource().getFileName(),
            original.getSource().getMimeType(),
            stored.getSize(),
            stored.getStorageKey(),
            original.getSource().getDisplayProfile()
          ),
          new ProjectMetadata(now, now, primitives.metadata.width, primitives.metadata.height)
        );
        await this.projects.save(project);
        try { await this.journal.complete(id); } catch { /* Reconciliation completes the committed duplicate. */ }
        return project;
      } catch (error: unknown) {
        try {
          if (sourceWasSaved) await this.sourceFiles.delete(id);
          await this.journal.complete(id);
        } catch { /* Keep the journal entry for startup reconciliation. */ }
        throw error;
      }
    });
  }
}
