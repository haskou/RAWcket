import type { ProjectRating } from './value-objects/ProjectRating';
import type { ProjectTags } from './value-objects/ProjectTags';

export class ProjectOrganization {
  public constructor(
    private rating: ProjectRating,
    private tags: ProjectTags
  ) {}

  public changeRating(rating: ProjectRating): void {
    this.rating = rating;
  }

  public replaceTags(tags: ProjectTags): void {
    this.tags = tags;
  }

  public getRating(): ProjectRating {
    return this.rating;
  }

  public getTags(): ProjectTags {
    return this.tags;
  }
}
