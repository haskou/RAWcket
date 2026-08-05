import type { ProjectRating } from './value-objects/ProjectRating';
import type { ProjectTags } from './value-objects/ProjectTags';

export class ProjectOrganization {
  public constructor(
    private rating: ProjectRating,
    private tags: ProjectTags,
    private favorite: boolean
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
  public chooseFavorite(favorite: boolean): void { this.favorite = favorite; }
  public isFavorite(): boolean { return this.favorite; }
}
