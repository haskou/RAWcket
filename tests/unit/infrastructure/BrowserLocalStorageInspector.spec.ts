import { BrowserLocalStorageInspector } from '@/shared/infrastructure/storage/BrowserLocalStorageInspector';

describe('BrowserLocalStorageInspector', () => {
  it('reports browser quota, usage, and persistence without mutating storage', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: vi.fn(() => Promise.resolve({ usage: 123, quota: 456 })),
        persisted: vi.fn(() => Promise.resolve(true))
      }
    });

    await expect(new BrowserLocalStorageInspector().inspect()).resolves.toEqual({
      supported: true,
      persistent: true,
      usageBytes: 123,
      quotaBytes: 456
    });
  });
});
