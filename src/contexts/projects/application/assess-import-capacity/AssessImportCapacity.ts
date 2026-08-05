import type { LocalStorageCapacity, LocalStorageInspector } from '../ports/LocalStorageInspector';
import type { AssessImportCapacityMessage } from './messages/AssessImportCapacityMessage';

export type ImportCapacityAssessment = LocalStorageCapacity & {
  availableBytes: number;
  safetyReserveBytes: number;
  canImport: boolean;
};

export class AssessImportCapacity {
  private static readonly MINIMUM_SAFETY_RESERVE_BYTES = 64 * 1024 * 1024;

  public constructor(private readonly inspector: LocalStorageInspector) {}

  public async assess(message: AssessImportCapacityMessage): Promise<ImportCapacityAssessment> {
    const capacity = await this.inspector.inspect();
    if (!capacity.supported) return { ...capacity, availableBytes: 0, safetyReserveBytes: 0, canImport: true };
    const availableBytes = Math.max(0, capacity.quotaBytes - capacity.usageBytes);
    const safetyReserveBytes = Math.max(
      AssessImportCapacity.MINIMUM_SAFETY_RESERVE_BYTES,
      Math.round(capacity.quotaBytes * 0.1)
    );
    return {
      ...capacity,
      availableBytes,
      safetyReserveBytes,
      canImport: availableBytes - safetyReserveBytes >= message.getFileSizeBytes()
    };
  }
}
