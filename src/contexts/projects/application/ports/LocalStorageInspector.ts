export type LocalStorageCapacity = {
  supported: boolean;
  persistent: boolean;
  usageBytes: number;
  quotaBytes: number;
};

export interface LocalStorageInspector {
  inspect(): Promise<LocalStorageCapacity>;
}
