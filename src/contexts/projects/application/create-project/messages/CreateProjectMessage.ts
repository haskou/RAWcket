import { StringValueObject, Timestamp } from '@haskou/value-objects';
import { ProjectMetadata } from '../../../domain/ProjectMetadata';
import { SourceImageReference } from '../../../domain/SourceImageReference';
import { ProjectId } from '../../../domain/value-objects/ProjectId';
import { ProjectName } from '../../../domain/value-objects/ProjectName';

const supportedMimeTypes = new Set(['image/jpeg', 'image/png']);

export class CreateProjectMessage {
  private readonly projectId = new ProjectId(crypto.randomUUID());
  private readonly projectName: ProjectName;
  private readonly createdAt: Timestamp;

  public constructor(
    name: string,
    private readonly file: Blob,
    private readonly fileName: string,
    private readonly width: number,
    private readonly height: number,
    now = Date.now()
  ) {
    this.projectName = new ProjectName(name);
    this.createdAt = Timestamp.new(now);
    if (!supportedMimeTypes.has(file.type)) {
      throw new Error('Solo se pueden importar imagenes JPEG o PNG en esta iteracion.');
    }
  }

  public getProjectId(): ProjectId {
    return this.projectId;
  }
  public getProjectName(): ProjectName {
    return this.projectName;
  }
  public getFile(): Blob {
    return this.file;
  }
  public createSourceReference(storageKey: StringValueObject): SourceImageReference {
    return new SourceImageReference(
      new StringValueObject(this.fileName),
      new StringValueObject(this.file.type),
      this.file.size,
      storageKey
    );
  }
  public createMetadata(): ProjectMetadata {
    return new ProjectMetadata(this.createdAt, this.createdAt, this.width, this.height);
  }
}
