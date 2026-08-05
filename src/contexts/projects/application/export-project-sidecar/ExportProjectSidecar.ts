import type { PhotoProject } from '../../domain/PhotoProject';
import type { ProjectSidecarCodec } from '../ports/ProjectSidecarCodec';
import type { ExportProjectSidecarMessage } from './messages/ExportProjectSidecarMessage';

export class ExportProjectSidecar {
  public constructor(private readonly codec: ProjectSidecarCodec) {}
  public export(project: PhotoProject, message: ExportProjectSidecarMessage): Blob {
    if (!project.isIdentifiedBy(message.getProjectId())) throw new Error('The sidecar request belongs to another project.');
    return this.codec.encode(project);
  }
}
