import type { Timestamp } from '@haskou/value-objects';
import type { StringValueObject } from '@haskou/value-objects';
import type { ProjectId } from './value-objects/ProjectId';
import type { ProjectName } from './value-objects/ProjectName';
import type { ProjectRating } from './value-objects/ProjectRating';
import type { ProjectSearchQuery } from './value-objects/ProjectSearchQuery';
import type { ProjectTags } from './value-objects/ProjectTags';

export class PhotoProjectSummary {
  public constructor(
    private readonly id: ProjectId,
    private readonly name: ProjectName,
    private readonly updatedAt: Timestamp,
    private readonly sourceMimeType: StringValueObject,
    private readonly rating: ProjectRating,
    private readonly tags: ProjectTags
  ) {}
  public getId(): ProjectId {
    return this.id;
  }
  public getName(): ProjectName {
    return this.name;
  }
  public getUpdatedAt(): Timestamp {
    return this.updatedAt;
  }
  public getSourceMimeType(): StringValueObject {
    return this.sourceMimeType;
  }
  public getRating(): ProjectRating {
    return this.rating;
  }
  public getTags(): ProjectTags {
    return this.tags;
  }
  public matches(query: ProjectSearchQuery, minimumRating: ProjectRating): boolean {
    return this.rating.isGreaterOrEqualThan(minimumRating)
      && (query.matches(this.name) || this.tags.matches(query));
  }
}
