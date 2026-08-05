import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import type { DeleteProjectMessage } from './messages/DeleteProjectMessage';

export class DeleteProject {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly sourceFiles: SourceFileRepository
  ) {}
  public async delete(message: DeleteProjectMessage): Promise<void> {
    await this.sourceFiles.delete(message.getProjectId());
    await this.projects.delete(message.getProjectId());
  }
}
