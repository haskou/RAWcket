import { Enum, type StringValueObject } from '@haskou/value-objects';
import type { ProjectId } from '../../domain/value-objects/ProjectId';

const projectAssetKinds = [
  'raw-source',
  'image-source',
  'preview',
  'thumbnail',
  'rasterized-mask',
  'segmentation-embedding',
  'render-cache'
] as const;
export type ProjectAssetKindPrimitive = (typeof projectAssetKinds)[number];

export class ProjectAssetKind extends Enum<ProjectAssetKindPrimitive> {
  private constructor(value: ProjectAssetKindPrimitive) { super(value); }
  public static fromPrimitives(value: ProjectAssetKindPrimitive): ProjectAssetKind { return new ProjectAssetKind(value); }
  public getValues(): ProjectAssetKindPrimitive[] { return [...projectAssetKinds]; }
}

export interface ProjectAssetRepository {
  save(projectId: ProjectId, kind: ProjectAssetKind, key: StringValueObject, content: Blob): Promise<void>;
  find(projectId: ProjectId, kind: ProjectAssetKind, key: StringValueObject): Promise<Blob | null>;
  delete(projectId: ProjectId, kind: ProjectAssetKind, key: StringValueObject): Promise<void>;
  deleteRegenerableAssets(projectId: ProjectId): Promise<void>;
}
