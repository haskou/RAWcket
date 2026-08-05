import type { AiCredential } from '../ports/AiCredentialVault';
import type { AiCredentialVault } from '../ports/AiCredentialVault';
import type { UnlockAiMessage } from './messages/UnlockAiMessage';

export class UnlockAi {
  public constructor(private readonly vault: AiCredentialVault) {}
  public unlock(message: UnlockAiMessage): Promise<AiCredential> { return this.vault.unlock(message.getPassword()); }
}
