import type { AiProviderPrimitive } from '../../domain/AiProvider';
import type { AiCredentialVault } from '../ports/AiCredentialVault';

export type AiConfigurationStatus = {
  ready: boolean;
  encrypted: boolean;
  provider: AiProviderPrimitive | null;
  model: string | null;
};

export class InspectAiConfiguration {
  public constructor(private readonly vault: AiCredentialVault) {}

  public async inspect(): Promise<AiConfigurationStatus> {
    const session = this.vault.getSessionCredential();
    const encrypted = await this.vault.getEncryptedSummary();
    const visible = session ?? encrypted;
    return {
      ready: session !== null,
      encrypted: encrypted !== null,
      provider: visible?.provider.valueOf() ?? null,
      model: visible?.model.valueOf() ?? null
    };
  }
}
