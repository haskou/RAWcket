import { AssessImportCapacity } from '@/contexts/projects/application/assess-import-capacity/AssessImportCapacity';
import { AssessImportCapacityMessage } from '@/contexts/projects/application/assess-import-capacity/messages/AssessImportCapacityMessage';
import type { LocalStorageInspector } from '@/contexts/projects/application/ports/LocalStorageInspector';

describe('AssessImportCapacity', () => {
  it('preserves a safety reserve instead of filling browser storage to the quota', async () => {
    const inspect = vi.fn<LocalStorageInspector['inspect']>().mockResolvedValue({ supported: true, persistent: false, usageBytes: 800_000_000, quotaBytes: 1_000_000_000 });
    const inspector: LocalStorageInspector = { inspect };
    const assessment = await new AssessImportCapacity(inspector).assess(new AssessImportCapacityMessage(120_000_000));

    expect(assessment.availableBytes).toBe(200_000_000);
    expect(assessment.safetyReserveBytes).toBe(100_000_000);
    expect(assessment.canImport).toBe(false);
  });

  it('does not block imports when the StorageManager estimate API is unavailable', async () => {
    const inspect = vi.fn<LocalStorageInspector['inspect']>().mockResolvedValue({ supported: false, persistent: false, usageBytes: 0, quotaBytes: 0 });
    const inspector: LocalStorageInspector = { inspect };

    await expect(new AssessImportCapacity(inspector).assess(new AssessImportCapacityMessage(10))).resolves.toMatchObject({ canImport: true });
  });
});
