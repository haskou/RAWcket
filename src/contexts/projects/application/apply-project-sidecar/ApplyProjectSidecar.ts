import { Timestamp } from '@haskou/value-objects';
import { EDIT_OPERATION } from '../../domain/EditOperation';
import type { PhotoProject } from '../../domain/PhotoProject';
import type { ProjectSidecarCodec } from '../ports/ProjectSidecarCodec';
import type { ApplyProjectSidecarMessage } from './messages/ApplyProjectSidecarMessage';

export class ApplyProjectSidecar {
  public constructor(private readonly codec: ProjectSidecarCodec) {}
  public async apply(project: PhotoProject, message: ApplyProjectSidecarMessage): Promise<PhotoProject> {
    if (!project.isIdentifiedBy(message.getProjectId())) throw new Error('The sidecar belongs to another project.');
    const recipe = await this.codec.decode(message.getSidecar());
    project.apply({ kind: EDIT_OPERATION.REPLACE_RECIPE, recipe, groupId: null }, Timestamp.new(message.getOccurredAt()));
    return project;
  }
}
