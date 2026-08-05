import type { PhotoProject } from '../../domain/PhotoProject';
import type { PhotoProjectSummary } from '../../domain/PhotoProjectSummary';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { ProjectId } from '../../domain/value-objects/ProjectId';

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, PhotoProject>();
  public findById(id: ProjectId): Promise<PhotoProject | null> {
    return Promise.resolve(this.projects.get(id.valueOf()) ?? null);
  }
  public findAll(): Promise<PhotoProjectSummary[]> {
    return Promise.resolve([...this.projects.values()].map((project) => project.getSummary()));
  }
  public save(project: PhotoProject): Promise<void> {
    this.projects.set(project.getId().valueOf(), project);
    return Promise.resolve();
  }
  public delete(id: ProjectId): Promise<void> {
    this.projects.delete(id.valueOf());
    return Promise.resolve();
  }
}
