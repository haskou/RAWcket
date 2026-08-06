import { z } from 'zod';
import { RawDisplayProfile } from '../../domain/RawDisplayProfile';
import type { ProjectMigration } from './ProjectMigration';

const versionElevenSchema = z.looseObject({
  schemaVersion: z.literal(11),
  source: z.looseObject({})
});

export class VersionElevenToTwelveProjectMigration implements ProjectMigration {
  public readonly from = 11;
  public readonly to = 12;

  public migrate(input: unknown): unknown {
    const project = versionElevenSchema.parse(input);
    return {
      ...project,
      schemaVersion: 12,
      source: {
        ...project.source,
        displayProfile: RawDisplayProfile.neutral().toPrimitives()
      }
    };
  }
}
