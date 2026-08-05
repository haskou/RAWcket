export type CloudStorageStatus = {
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  autoUploadExports: boolean;
};

export type CloudAssetKind = 'project-bundle' | 'original' | 'photo-export';
export type CloudUploadResult = { id: string; name: string; webViewLink: string | null };

export interface CloudStorageGateway {
  inspect(): Promise<CloudStorageStatus>;
  configure(autoUploadExports: boolean): Promise<CloudStorageStatus>;
  connect(): Promise<CloudStorageStatus>;
  disconnect(): Promise<CloudStorageStatus>;
  upload(name: string, content: Blob, kind: CloudAssetKind): Promise<CloudUploadResult>;
}
