import type { PhotoProjectSummary } from '../../domain/PhotoProjectSummary';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { ListProjectsMessage } from './messages/ListProjectsMessage';

export class ListProjects {
  public constructor(private readonly projects: ProjectRepository) {}
  public async list(message: ListProjectsMessage): Promise<PhotoProjectSummary[]> {
    const projects = await this.projects.findAll();
    return projects.filter((project) => project.matches(message.getQuery(), message.getMinimumRating(), message.shouldListFavoritesOnly()));
  }
}
