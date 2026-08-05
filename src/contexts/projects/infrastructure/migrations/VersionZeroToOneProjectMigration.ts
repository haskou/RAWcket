import { z } from 'zod';
import type { ProjectMigration } from './ProjectMigration';

const legacyProjectSchema = z.object({
  schemaVersion: z.literal(0),
  id: z.string(),
  name: z.string(),
  source: z.unknown(),
  metadata: z.unknown(),
  recipe: z.unknown(),
  history: z.unknown()
}).passthrough();

export class VersionZeroToOneProjectMigration implements ProjectMigration {
  public readonly from = 0;
  public readonly to = 1;
  public migrate(input: unknown): unknown {
    const legacy = legacyProjectSchema.parse(input);
    return { ...legacy, schemaVersion: 1, uiState: { mode: 'simple' } };
  }
}
