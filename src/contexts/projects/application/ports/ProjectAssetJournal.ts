import { Enum } from '@haskou/value-objects';
import type { Timestamp } from '@haskou/value-objects';
import type { ProjectId } from '../../domain/value-objects/ProjectId';

const mutationKinds = ['create', 'delete'] as const;
export type ProjectAssetMutationKindPrimitive = (typeof mutationKinds)[number];

export class ProjectAssetMutationKind extends Enum<ProjectAssetMutationKindPrimitive> {
  public static readonly CREATE = new ProjectAssetMutationKind('create');
  public static readonly DELETE = new ProjectAssetMutationKind('delete');
  private constructor(value: ProjectAssetMutationKindPrimitive) { super(value); }
  public static fromPrimitives(value: ProjectAssetMutationKindPrimitive): ProjectAssetMutationKind { return new ProjectAssetMutationKind(value); }
  public getValues(): ProjectAssetMutationKindPrimitive[] { return [...mutationKinds]; }
  public isCreate(): boolean { return this.isEqual(ProjectAssetMutationKind.CREATE); }
}

export class PendingProjectAssetMutation {
  public constructor(
    private readonly projectId: ProjectId,
    private readonly kind: ProjectAssetMutationKind,
    private readonly startedAt: Timestamp
  ) {}
  public getProjectId(): ProjectId { return this.projectId; }
  public getKind(): ProjectAssetMutationKind { return this.kind; }
  public getStartedAt(): Timestamp { return this.startedAt; }
}

export interface ProjectAssetJournal {
  begin(projectId: ProjectId, kind: ProjectAssetMutationKind, startedAt: Timestamp): Promise<void>;
  complete(projectId: ProjectId): Promise<void>;
  findPending(): Promise<PendingProjectAssetMutation[]>;
}
