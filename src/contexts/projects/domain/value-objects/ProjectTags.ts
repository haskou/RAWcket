import type { ProjectSearchQuery } from './ProjectSearchQuery';
import { ProjectTag } from './ProjectTag';

export class ProjectTags {
  private static readonly MAXIMUM = 20;
  private readonly tags: ProjectTag[];

  public constructor(tags: ProjectTag[]) {
    const unique = tags.filter((tag, index, all) => all.findIndex((candidate) => candidate.isEqual(tag)) === index);
    if (unique.length > ProjectTags.MAXIMUM) throw new Error('A project can have at most 20 tags.');
    this.tags = unique;
  }

  public static fromPrimitives(tags: string[]): ProjectTags {
    return new ProjectTags(tags.map((tag) => new ProjectTag(tag)));
  }

  public matches(query: ProjectSearchQuery): boolean {
    return query.matches(...this.tags);
  }

  public getAll(): ProjectTag[] {
    return [...this.tags];
  }

  public toPrimitives(): string[] {
    return this.tags.map((tag) => tag.valueOf());
  }
}
