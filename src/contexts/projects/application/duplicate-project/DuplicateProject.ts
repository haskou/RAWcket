import { Timestamp } from '@haskou/value-objects';
import type { PhotoProject } from '../../domain/PhotoProject';
import { ProjectMetadata } from '../../domain/ProjectMetadata';
import { SourceImageReference } from '../../domain/SourceImageReference';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import { ProjectId } from '../../domain/value-objects/ProjectId';
import type { DuplicateProjectMessage } from './messages/DuplicateProjectMessage';

export class DuplicateProject {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly sourceFiles: SourceFileRepository
  ) {}
  public async duplicate(message: DuplicateProjectMessage): Promise<PhotoProject> {
    const original = await this.projects.findById(message.getProjectId());
    const source = await this.sourceFiles.find(message.getProjectId());
    if (original === null || source === null) throw new Error('An incomplete project cannot be duplicated.');
    const primitives = original.toPrimitives();
    const id = new ProjectId(crypto.randomUUID());
    const stored = await this.sourceFiles.save(id, source);
    const now = Timestamp.now();
    const project = original.duplicate(
      id,
      new SourceImageReference(
        original.getSource().getFileName(),
        original.getSource().getMimeType(),
        stored.getSize(),
        stored.getStorageKey()
      ),
      new ProjectMetadata(
        now,
        now,
        primitives.metadata.width,
        primitives.metadata.height
      )
    );
    await this.projects.save(project);
    return project;
  }
}
