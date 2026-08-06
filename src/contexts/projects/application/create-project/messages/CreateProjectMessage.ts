import { StringValueObject, Timestamp } from '@haskou/value-objects';
import { CaptureMetadata, type CaptureMetadataPrimitives } from '../../../domain/CaptureMetadata';
import { ProjectMetadata } from '../../../domain/ProjectMetadata';
import { RawDisplayProfile, type RawDisplayProfilePrimitives } from '../../../domain/RawDisplayProfile';
import { SourceImageReference } from '../../../domain/SourceImageReference';
import { ProjectId } from '../../../domain/value-objects/ProjectId';
import { ProjectName } from '../../../domain/value-objects/ProjectName';

const supportedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/x-sony-arw']);

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
    private readonly captureMetadata: CaptureMetadataPrimitives,
    private readonly displayProfile: RawDisplayProfilePrimitives = RawDisplayProfile.neutral().toPrimitives(),
    now = Date.now()
  ) {
    this.projectName = new ProjectName(name);
    this.createdAt = Timestamp.new(now);
    if (!supportedMimeTypes.has(file.type)) {
      throw new Error('Only JPEG, PNG, and Sony ARW images can currently be imported.');
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
      storageKey,
      RawDisplayProfile.fromPrimitives(this.displayProfile)
    );
  }
  public createMetadata(): ProjectMetadata {
    return new ProjectMetadata(this.createdAt, this.createdAt, this.width, this.height);
  }
  public createCaptureMetadata(): CaptureMetadata {
    return CaptureMetadata.fromPrimitives(this.captureMetadata);
  }
}
