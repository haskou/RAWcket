export type PersistentStorageResult = 'granted' | 'denied' | 'unsupported';

export class PersistentStorageRequest {
  public async request(): Promise<PersistentStorageResult> {
    if (typeof navigator === 'undefined') return 'unsupported';
    const storage = Reflect.get(navigator, 'storage') as StorageManager | undefined;
    if (storage === undefined || typeof storage.persist !== 'function') return 'unsupported';
    return (await storage.persist()) ? 'granted' : 'denied';
  }
}
