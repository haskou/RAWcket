import type { AiCredentialAccountRepository } from '../ports/AiCredentialAccountRepository';

export class RemoveAiFromAccount {
  public constructor(private readonly accountCredentials: AiCredentialAccountRepository) {}
  public remove(): Promise<void> { return this.accountCredentials.remove(); }
}
