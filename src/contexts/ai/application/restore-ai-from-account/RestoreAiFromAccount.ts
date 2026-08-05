import type { AiCredentialAccountRepository } from '../ports/AiCredentialAccountRepository';
import type { AiCredentialVault } from '../ports/AiCredentialVault';

export class RestoreAiFromAccount {
  public constructor(private readonly accountCredentials: AiCredentialAccountRepository, private readonly vault: AiCredentialVault) {}

  public async restore(): Promise<boolean> {
    const credential = await this.accountCredentials.find();
    if (credential === null) return false;
    this.vault.rememberForSession(credential.provider, credential.model, credential.apiKey);
    return true;
  }
}
