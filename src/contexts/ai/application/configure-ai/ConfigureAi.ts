import type { AiCredentialVault } from '../ports/AiCredentialVault';
import type { AiCredentialAccountRepository } from '../ports/AiCredentialAccountRepository';
import type { ConfigureAiMessage } from './messages/ConfigureAiMessage';

export class ConfigureAi {
  public constructor(private readonly vault: AiCredentialVault, private readonly accountCredentials: AiCredentialAccountRepository) {}

  public async configure(message: ConfigureAiMessage): Promise<void> {
    const storageMode = message.getStorageMode();
    const password = message.getPassword();
    if (storageMode === 'encrypted-device' && password !== null) await this.vault.saveEncrypted(message.getProvider(), message.getModel(), message.getApiKey(), password);
    if (storageMode === 'google-account') await this.accountCredentials.save({ provider: message.getProvider(), model: message.getModel(), apiKey: message.getApiKey() });
    this.vault.rememberForSession(message.getProvider(), message.getModel(), message.getApiKey());
  }
}
