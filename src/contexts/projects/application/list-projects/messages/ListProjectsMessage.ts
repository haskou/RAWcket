import { ProjectRating } from '../../../domain/value-objects/ProjectRating';
import { ProjectSearchQuery } from '../../../domain/value-objects/ProjectSearchQuery';

export class ListProjectsMessage {
  private readonly query: ProjectSearchQuery;
  private readonly minimumRating: ProjectRating;

  public constructor(query: string, minimumRating: number, private readonly favoritesOnly = false) {
    this.query = new ProjectSearchQuery(query);
    this.minimumRating = new ProjectRating(minimumRating);
  }

  public getQuery(): ProjectSearchQuery {
    return this.query;
  }

  public getMinimumRating(): ProjectRating {
    return this.minimumRating;
  }
  public shouldListFavoritesOnly(): boolean { return this.favoritesOnly; }
}
