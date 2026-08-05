import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { useApplication } from '../ApplicationContext';

export function AiSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement | null {
  const { apiKeyVault } = useApplication();
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [rememberSession, setRememberSession] = useState(true);
  const [saveEncrypted, setSaveEncrypted] = useState(false);
  const [hasEncryptedKey, setHasEncryptedKey] = useState(false);
  const [message, setMessage] = useState('AI is disabled. No provider is connected.');

  useEffect(() => {
    void apiKeyVault.hasEncryptedKey().then(setHasEncryptedKey);
  }, [apiKeyVault, open]);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      if (rememberSession) apiKeyVault.rememberForSession(apiKey);
      if (saveEncrypted) await apiKeyVault.saveEncrypted(apiKey, password);
      setApiKey('');
      setPassword('');
      setHasEncryptedKey(saveEncrypted || hasEncryptedKey);
      setMessage('The key was stored according to your choices. AI remains disabled until a provider is configured.');
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'The key could not be stored.');
    }
  };

  const remove = async (): Promise<void> => {
    await apiKeyVault.remove();
    setApiKey('');
    setPassword('');
    setHasEncryptedKey(false);
    setMessage('The key has been removed from this session and device.');
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">Privacy first</span>
            <h2 id="ai-settings-title">AI settings</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close settings">×</button>
        </div>
        <p className="notice warning">Storing an API key in a shared browser carries risk. Encryption requires a master password that RAWcket never stores.</p>
        <form onSubmit={(event) => void submit(event)}>
          <label className="field-label" htmlFor="api-key">API key</label>
          <input id="api-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" placeholder="Never logged or added to the project" />
          <label className="check-row">
            <input type="checkbox" checked={rememberSession} onChange={(event) => setRememberSession(event.target.checked)} />
            Remember for this session only
          </label>
          <label className="check-row">
            <input type="checkbox" checked={saveEncrypted} onChange={(event) => setSaveEncrypted(event.target.checked)} />
            Store encrypted on this device
          </label>
          {saveEncrypted && (
            <>
              <label className="field-label" htmlFor="master-password">Master password (12 characters minimum)</label>
              <input id="master-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
            </>
          )}
          <p className="muted">Encryption: AES-GCM; derivation: PBKDF2-SHA-256, 210,000 iterations. Encrypted key present: {hasEncryptedKey ? 'yes' : 'no'}.</p>
          <p className="status-copy" aria-live="polite">{message}</p>
          <div className="dialog-actions">
            <button className="button ghost danger" type="button" onClick={() => void remove()}>Remove key</button>
            <button className="button primary" type="submit">Save choices</button>
          </div>
        </form>
      </section>
    </div>
  );
}
