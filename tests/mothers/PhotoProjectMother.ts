import { StringValueObject, Timestamp } from '@haskou/value-objects';
import { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import { ProjectMetadata } from '@/contexts/projects/domain/ProjectMetadata';
import { SourceImageReference } from '@/contexts/projects/domain/SourceImageReference';
import { ProjectId } from '@/contexts/projects/domain/value-objects/ProjectId';
import { ProjectName } from '@/contexts/projects/domain/value-objects/ProjectName';

export class PhotoProjectMother {
  public static create(id = new ProjectId(crypto.randomUUID())): PhotoProject {
    const now = Timestamp.new(1_750_000_000_000);
    return PhotoProject.create(
      id,
      new ProjectName('Proyecto de prueba'),
      new SourceImageReference(
        new StringValueObject('source.jpg'),
        new StringValueObject('image/jpeg'),
        3,
        new StringValueObject(`${id.valueOf()}.source`)
      ),
      new ProjectMetadata(now, now, 1200, 800),
      10
    );
  }
}
