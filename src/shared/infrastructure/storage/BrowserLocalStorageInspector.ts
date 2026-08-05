import type {
  LocalStorageCapacity,
  LocalStorageInspector
} from '../../../contexts/projects/application/ports/LocalStorageInspector';

export class BrowserLocalStorageInspector implements LocalStorageInspector {
  public async inspect(): Promise<LocalStorageCapacity> {
    if (typeof navigator === 'undefined') return this.unsupported();
    const storage = Reflect.get(navigator, 'storage') as StorageManager | undefined;
    if (storage === undefined || typeof storage.estimate !== 'function') return this.unsupported();
    const [estimate, persistent] = await Promise.all([
      storage.estimate(),
      typeof storage.persisted === 'function' ? storage.persisted() : Promise.resolve(false)
    ]);
    return {
      supported: true,
      persistent,
      usageBytes: estimate.usage ?? 0,
      quotaBytes: estimate.quota ?? 0
    };
  }

  private unsupported(): LocalStorageCapacity {
    return { supported: false, persistent: false, usageBytes: 0, quotaBytes: 0 };
  }
}
