import type { PhotoProjectSummary } from '../../domain/PhotoProjectSummary';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';

export class ListProjects {
  public constructor(private readonly projects: ProjectRepository) {}
  public list(): Promise<PhotoProjectSummary[]> {
    return this.projects.findAll();
  }
}
