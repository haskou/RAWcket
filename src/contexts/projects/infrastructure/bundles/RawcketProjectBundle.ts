import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { Timestamp } from '@haskou/value-objects';
import type { Queue } from '@haskou/flow';
import type { ProjectExporter } from '../../application/ports/ProjectExporter';
import type { ProjectImporter } from '../../application/ports/ProjectImporter';
import { ProjectAssetMutationKind, type ProjectAssetJournal } from '../../application/ports/ProjectAssetJournal';
import { PhotoProject, type PhotoProjectPrimitives } from '../../domain/PhotoProject';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import { ProjectId } from '../../domain/value-objects/ProjectId';
import type { ProjectMigrator } from '../migrations/ProjectMigrator';
import { photoProjectSchema, projectManifestSchema } from '../serialization/ProjectSchemas';

const PROJECT_ENTRY = 'project.json';
const MANIFEST_ENTRY = 'manifest.json';

export class RawcketProjectBundle implements ProjectExporter, ProjectImporter {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly sourceFiles: SourceFileRepository,
    private readonly migrator: ProjectMigrator,
    private readonly journal: ProjectAssetJournal,
    private readonly queue: Queue
  ) {}

  public async exportProject(projectId: ProjectId): Promise<Blob> {
    const project = await this.projects.findById(projectId);
    const source = await this.sourceFiles.find(projectId);
    if (project === null || source === null) throw new Error('The project is incomplete and cannot be exported.');
    const projectBytes = strToU8(JSON.stringify(project.toPrimitives(), null, 2));
    const sourceBytes = new Uint8Array(await this.readBlob(source));
    const mimeType = project.getSource().getMimeType().valueOf();
    const sourceEntry = mimeType === 'image/png' ? 'original.png' : mimeType === 'image/x-sony-arw' ? 'original.arw' : 'original.jpg';
    const manifest = {
      format: 'rawcket-project' as const,
      formatVersion: 1 as const,
      projectSchemaVersion: project.toPrimitives().schemaVersion,
      files: {
        [PROJECT_ENTRY]: { sha256: await this.sha256(projectBytes), size: projectBytes.byteLength },
        [sourceEntry]: { sha256: await this.sha256(sourceBytes), size: sourceBytes.byteLength }
      }
    };
    const manifestBytes = strToU8(JSON.stringify(manifest, null, 2));
    const zip = zipSync({
      [MANIFEST_ENTRY]: manifestBytes,
      [PROJECT_ENTRY]: projectBytes,
      [sourceEntry]: sourceBytes
    }, { level: 6 });
    return new Blob([zip], { type: 'application/vnd.rawcket.project+zip' });
  }

  public async importProject(bundle: Blob): Promise<ProjectId> {
    let files: Record<string, Uint8Array>;
    try {
      files = unzipSync(new Uint8Array(await this.readBlob(bundle)));
    } catch {
      throw new Error('The file is not a valid .rawcket bundle.');
    }
    const manifestBytes = files[MANIFEST_ENTRY];
    const projectBytes = files[PROJECT_ENTRY];
    if (manifestBytes === undefined || projectBytes === undefined) {
      throw new Error('The bundle does not contain manifest.json and project.json.');
    }
    const manifest = projectManifestSchema.parse(JSON.parse(strFromU8(manifestBytes)));
    for (const [path, expected] of Object.entries(manifest.files)) {
      const bytes = files[path];
      if (bytes?.byteLength !== expected.size) {
        throw new Error(`Integrity verification failed for ${path}.`);
      }
      if (await this.sha256(bytes) !== expected.sha256) {
        throw new Error(`Integrity verification failed for ${path}.`);
      }
    }
    const sourceEntry = Object.keys(manifest.files).find((path) => path.startsWith('original.'));
    const sourceBytes = sourceEntry === undefined ? undefined : files[sourceEntry];
    if (sourceEntry === undefined || sourceBytes === undefined) throw new Error('The bundle does not contain the original image.');
    const migrated = this.migrator.migrate(JSON.parse(strFromU8(projectBytes)));
    const parsed = photoProjectSchema.parse(migrated);
    const requestedId = new ProjectId(parsed.id);
    const id = (await this.projects.findById(requestedId)) === null ? requestedId : new ProjectId(crypto.randomUUID());
    const mimeType = sourceEntry.endsWith('.png') ? 'image/png' : sourceEntry.endsWith('.arw') ? 'image/x-sony-arw' : 'image/jpeg';
    const source = new Blob([this.toArrayBuffer(sourceBytes)], { type: mimeType });
    return this.queue.run(async () => {
      await this.journal.begin(id, ProjectAssetMutationKind.CREATE, Timestamp.now());
      let sourceWasSaved = false;
      try {
        const stored = await this.sourceFiles.save(id, source);
        sourceWasSaved = true;
        const importable: PhotoProjectPrimitives = {
          ...parsed,
          id: id.valueOf(),
          source: { ...parsed.source, mimeType, size: source.size, storageKey: stored.getStorageKey().valueOf() }
        };
        await this.projects.save(PhotoProject.fromPrimitives(importable));
        try { await this.journal.complete(id); } catch { /* Reconciliation completes the committed import. */ }
        return id;
      } catch (error: unknown) {
        try {
          if (sourceWasSaved) await this.sourceFiles.delete(id);
          await this.journal.complete(id);
        } catch { /* Keep the journal entry for startup reconciliation. */ }
        throw error;
      }
    });
  }

  private async sha256(bytes: Uint8Array): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', this.toArrayBuffer(bytes));
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  }

  private readBlob(blob: Blob): Promise<ArrayBuffer> {
    if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The bundle bytes could not be read.'));
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) resolve(reader.result);
        else reject(new Error('The bundle did not produce binary data.'));
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }
}
