import type { Timestamp } from '@haskou/value-objects';
import type { StringValueObject } from '@haskou/value-objects';
import type { ProjectId } from './value-objects/ProjectId';
import type { ProjectName } from './value-objects/ProjectName';

export class PhotoProjectSummary {
  public constructor(
    private readonly id: ProjectId,
    private readonly name: ProjectName,
    private readonly updatedAt: Timestamp,
    private readonly sourceMimeType: StringValueObject
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
}
