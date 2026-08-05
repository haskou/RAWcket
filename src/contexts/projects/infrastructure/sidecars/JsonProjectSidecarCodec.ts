import { z } from 'zod';
import type { ProjectSidecarCodec } from '../../application/ports/ProjectSidecarCodec';
import type { DevelopmentRecipePrimitives } from '../../domain/DevelopmentRecipe';
import type { PhotoProject } from '../../domain/PhotoProject';
import { photoProjectSchema } from '../serialization/ProjectSchemas';

const sidecarSchema = z.object({
  format: z.literal('rawcket-sidecar'),
  formatVersion: z.literal(1),
  projectSchemaVersion: z.int().nonnegative(),
  source: z.object({ fileName: z.string().min(1), width: z.int().positive(), height: z.int().positive() }),
  recipe: photoProjectSchema.shape.recipe
});

export class JsonProjectSidecarCodec implements ProjectSidecarCodec {
  public encode(project: PhotoProject): Blob {
    const data = project.toPrimitives();
    const sidecar = sidecarSchema.parse({
      format: 'rawcket-sidecar',
      formatVersion: 1,
      projectSchemaVersion: data.schemaVersion,
      source: { fileName: data.source.fileName, width: data.metadata.width, height: data.metadata.height },
      recipe: data.recipe
    });
    return new Blob([JSON.stringify(sidecar, null, 2)], { type: 'application/json' });
  }

  public async decode(sidecar: Blob): Promise<DevelopmentRecipePrimitives> {
    try {
      const parsed = sidecarSchema.parse(JSON.parse(await this.readText(sidecar)));
      return structuredClone(parsed.recipe);
    } catch (error: unknown) {
      if (error instanceof SyntaxError || error instanceof z.ZodError) throw new Error('This file is not a valid RAWcket recipe sidecar.');
      throw error;
    }
  }

  private readText(sidecar: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The RAWcket sidecar could not be read.'));
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('The RAWcket sidecar does not contain text.'));
      reader.readAsText(sidecar);
    });
  }
}
