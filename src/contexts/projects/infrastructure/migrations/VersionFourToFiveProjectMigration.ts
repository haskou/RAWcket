import { z } from 'zod';
import { emptyCaptureMetadata } from '../../domain/CaptureMetadata';
import type { ProjectMigration } from './ProjectMigration';

const versionFourSchema = z.looseObject({ schemaVersion: z.literal(4) });

export class VersionFourToFiveProjectMigration implements ProjectMigration {
  public readonly from = 4;
  public readonly to = 5;

  public migrate(input: unknown): unknown {
    const project = versionFourSchema.parse(input);
    return {
      ...project,
      schemaVersion: 5,
      captureMetadata: emptyCaptureMetadata
    };
  }
}
