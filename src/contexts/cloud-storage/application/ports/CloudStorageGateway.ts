export type CloudStorageStatus = {
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  clientId: string | null;
  autoUploadExports: boolean;
};

export type CloudAssetKind = 'project-bundle' | 'original' | 'photo-export';
export type CloudUploadResult = { id: string; name: string; webViewLink: string | null };

export abstract class CloudStorageGateway {
  public abstract inspect(): Promise<CloudStorageStatus>;
  public abstract configure(clientId: string, autoUploadExports: boolean): Promise<CloudStorageStatus>;
  public abstract connect(): Promise<CloudStorageStatus>;
  public abstract disconnect(): Promise<CloudStorageStatus>;
  public abstract upload(name: string, content: Blob, kind: CloudAssetKind): Promise<CloudUploadResult>;
}
