import { deleteDB } from 'idb';
import { RawcketDatabase } from '@/shared/infrastructure/database/RawcketDatabase';
import { BrowserApiKeyVault } from '@/shared/infrastructure/security/BrowserApiKeyVault';
import { RawcketSettingsRepository } from '@/shared/infrastructure/settings/RawcketSettingsRepository';

describe('BrowserApiKeyVault', () => {
  it('cifra con contrasena, desbloquea y borra sin persistir la contrasena', async () => {
    const databaseName = `rawcket-vault-${crypto.randomUUID()}`;
    const connection = RawcketDatabase.open(databaseName);
    const vault = new BrowserApiKeyVault(new RawcketSettingsRepository(connection));

    await vault.saveEncrypted('sk-test-secret-123', 'una-contrasena-segura');
    expect(await vault.hasEncryptedKey()).toBe(true);
    expect(await vault.unlock('una-contrasena-segura')).toBe('sk-test-secret-123');
    await vault.remove();
    expect(await vault.hasEncryptedKey()).toBe(false);

    (await connection).close();
    await deleteDB(databaseName);
  });
});
