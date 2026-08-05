import type { AiModel } from '../../domain/AiModel';
import type { AiProvider } from '../../domain/AiProvider';

export type AiCredential = {
  provider: AiProvider;
  model: AiModel;
  apiKey: string;
};

export type AiCredentialSummary = Omit<AiCredential, 'apiKey'>;

export interface AiCredentialVault {
  rememberForSession(provider: AiProvider, model: AiModel, apiKey: string): void;
  getSessionCredential(): AiCredential | null;
  saveEncrypted(provider: AiProvider, model: AiModel, apiKey: string, password: string): Promise<void>;
  unlock(password: string): Promise<AiCredential>;
  getEncryptedSummary(): Promise<AiCredentialSummary | null>;
  remove(): Promise<void>;
}
