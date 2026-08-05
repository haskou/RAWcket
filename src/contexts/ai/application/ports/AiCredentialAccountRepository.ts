import type { AiCredential } from './AiCredentialVault';

export interface AiCredentialAccountRepository {
  find(): Promise<AiCredential | null>;
  save(credential: AiCredential): Promise<void>;
  remove(): Promise<void>;
}
