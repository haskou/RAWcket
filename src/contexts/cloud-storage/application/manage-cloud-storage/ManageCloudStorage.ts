import type { CloudStorageGateway, CloudStorageStatus, CloudUploadResult } from '../ports/CloudStorageGateway';
import type { ConfigureCloudStorageMessage } from './messages/ConfigureCloudStorageMessage';
import type { UploadCloudAssetMessage } from './messages/UploadCloudAssetMessage';

export class ManageCloudStorage {
  public constructor(private readonly gateway: CloudStorageGateway) {}
  public inspect(): Promise<CloudStorageStatus> { return this.gateway.inspect(); }
  public configure(message: ConfigureCloudStorageMessage): Promise<CloudStorageStatus> { return this.gateway.configure(message.shouldAutoUploadExports()); }
  public connect(): Promise<CloudStorageStatus> { return this.gateway.connect(); }
  public disconnect(): Promise<CloudStorageStatus> { return this.gateway.disconnect(); }
  public upload(message: UploadCloudAssetMessage): Promise<CloudUploadResult> { return this.gateway.upload(message.getName(), message.getContent(), message.getKind()); }
}
