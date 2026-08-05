import type { PhotoProject } from '../../domain/PhotoProject';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';

export class SaveProject {
  public constructor(private readonly projects: ProjectRepository) {}
  public save(project: PhotoProject): Promise<void> {
    return this.projects.save(project);
  }
}
