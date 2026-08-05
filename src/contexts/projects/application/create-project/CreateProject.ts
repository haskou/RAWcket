import { PhotoProject } from '../../domain/PhotoProject';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import type { CreateProjectMessage } from './messages/CreateProjectMessage';

export class CreateProject {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly sourceFiles: SourceFileRepository
  ) {}

  public async create(message: CreateProjectMessage): Promise<PhotoProject> {
    const stored = await this.sourceFiles.save(message.getProjectId(), message.getFile());
    try {
      const project = PhotoProject.create(
        message.getProjectId(),
        message.getProjectName(),
        message.createSourceReference(stored.getStorageKey()),
        message.createMetadata()
      );
      await this.projects.save(project);
      return project;
    } catch (error: unknown) {
      await this.sourceFiles.delete(message.getProjectId());
      throw error;
    }
  }
}
