import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type ProjectIndexRecord = {
  id: string;
  name: string;
  updatedAt: number;
  sourceMimeType: string;
  rating?: number;
  tags?: string[];
};

export type ProjectSnapshotRecord = {
  projectId: string;
  createdAt: number;
  project: unknown;
  sha256: string;
};

interface RawcketSchema extends DBSchema {
  projects: { key: string; value: unknown };
  projectIndex: { key: string; value: ProjectIndexRecord; indexes: { 'by-updatedAt': number } };
  projectSnapshots: { key: [string, number]; value: ProjectSnapshotRecord; indexes: { 'by-project': string } };
  sources: { key: string; value: Blob };
  settings: { key: string; value: unknown };
}

export type RawcketDatabaseConnection = IDBPDatabase<RawcketSchema>;

export class RawcketDatabase {
  public static open(name = 'rawcket'): Promise<RawcketDatabaseConnection> {
    return openDB<RawcketSchema>(name, 2, {
      upgrade(database): void {
        if (!database.objectStoreNames.contains('projects')) database.createObjectStore('projects');
        if (!database.objectStoreNames.contains('sources')) database.createObjectStore('sources');
        if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings');
        if (!database.objectStoreNames.contains('projectIndex')) {
          const index = database.createObjectStore('projectIndex', { keyPath: 'id' });
          index.createIndex('by-updatedAt', 'updatedAt');
        }
        if (!database.objectStoreNames.contains('projectSnapshots')) {
          const snapshots = database.createObjectStore('projectSnapshots', { keyPath: ['projectId', 'createdAt'] });
          snapshots.createIndex('by-project', 'projectId');
        }
      }
    });
  }
}
