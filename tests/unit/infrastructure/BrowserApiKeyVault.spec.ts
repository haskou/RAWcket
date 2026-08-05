import { deleteDB } from 'idb';
import { AiModel } from '@/contexts/ai/domain/AiModel';
import { AiProvider } from '@/contexts/ai/domain/AiProvider';
import { BrowserApiKeyVault } from '@/contexts/ai/infrastructure/security/BrowserApiKeyVault';
import { RawcketDatabase } from '@/shared/infrastructure/database/RawcketDatabase';
import { RawcketSettingsRepository } from '@/shared/infrastructure/settings/RawcketSettingsRepository';

describe('BrowserApiKeyVault', () => {
  it('encrypts provider metadata and key, unlocks into memory, and deletes the configuration', async () => {
    const databaseName = `rawcket-vault-${crypto.randomUUID()}`;
    const connection = RawcketDatabase.open(databaseName);
    const vault = new BrowserApiKeyVault(new RawcketSettingsRepository(connection));
    const model = new AiModel('vision-model-from-user');

    await vault.saveEncrypted(AiProvider.OPENAI, model, 'sk-test-secret-123', 'una-contrasena-segura');
    expect((await vault.getEncryptedSummary())?.model.isEqual(model)).toBe(true);
    const credential = await vault.unlock('una-contrasena-segura');
    expect(credential.apiKey).toBe('sk-test-secret-123');
    expect(credential.provider.isOpenAi()).toBe(true);
    expect(vault.getSessionCredential()?.model.isEqual(model)).toBe(true);
    await vault.remove();
    expect(await vault.getEncryptedSummary()).toBeNull();
    expect(vault.getSessionCredential()).toBeNull();

    (await connection).close();
    await deleteDB(databaseName);
  });
});
