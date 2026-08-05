import type { PhotoProject } from '../../domain/PhotoProject';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { FindProjectMessage } from './messages/FindProjectMessage';

export class FindProject {
  public constructor(private readonly projects: ProjectRepository) {}
  public find(message: FindProjectMessage): Promise<PhotoProject | null> {
    return this.projects.findById(message.getProjectId());
  }
}
