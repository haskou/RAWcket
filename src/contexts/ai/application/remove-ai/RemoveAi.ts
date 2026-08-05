import type { AiCredentialVault } from '../ports/AiCredentialVault';

export class RemoveAi {
  public constructor(private readonly vault: AiCredentialVault) {}
  public remove(): Promise<void> { return this.vault.remove(); }
}
