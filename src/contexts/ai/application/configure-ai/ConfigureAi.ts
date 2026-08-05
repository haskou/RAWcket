import type { AiCredentialVault } from '../ports/AiCredentialVault';
import type { ConfigureAiMessage } from './messages/ConfigureAiMessage';

export class ConfigureAi {
  public constructor(private readonly vault: AiCredentialVault) {}

  public async configure(message: ConfigureAiMessage): Promise<void> {
    const password = message.getPassword();
    if (password !== null) await this.vault.saveEncrypted(message.getProvider(), message.getModel(), message.getApiKey(), password);
    this.vault.rememberForSession(message.getProvider(), message.getModel(), message.getApiKey());
  }
}
