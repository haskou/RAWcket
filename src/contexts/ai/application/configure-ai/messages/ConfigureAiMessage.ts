import { AiModel } from '../../../domain/AiModel';
import { AiProvider, type AiProviderPrimitive } from '../../../domain/AiProvider';

export type AiCredentialStorageMode = 'encrypted-device' | 'session' | 'google-account';

export class ConfigureAiMessage {
  private readonly provider: AiProvider;
  private readonly model: AiModel;
  private readonly apiKey: string;

  public constructor(
    provider: AiProviderPrimitive,
    model: string,
    apiKey: string,
    private readonly storageMode: AiCredentialStorageMode,
    private readonly password: string | null
  ) {
    this.provider = AiProvider.fromPrimitives(provider);
    this.model = new AiModel(model);
    this.apiKey = apiKey.trim();
    if (this.apiKey.length < 8) throw new Error('The API key appears incomplete.');
    if (storageMode === 'encrypted-device' && (password === null || password.length < 12)) throw new Error('The master password must contain at least 12 characters.');
  }

  public getProvider(): AiProvider { return this.provider; }
  public getModel(): AiModel { return this.model; }
  public getApiKey(): string { return this.apiKey; }
  public getStorageMode(): AiCredentialStorageMode { return this.storageMode; }
  public getPassword(): string | null { return this.password; }
}
