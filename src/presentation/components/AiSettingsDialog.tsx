import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { ConfigureAiMessage, type AiCredentialStorageMode } from '@/contexts/ai/application/configure-ai/messages/ConfigureAiMessage';
import type { AiConfigurationStatus } from '@/contexts/ai/application/inspect-ai-configuration/InspectAiConfiguration';
import type { CloudStorageStatus } from '@/contexts/cloud-storage/application/ports/CloudStorageGateway';
import { UnlockAiMessage } from '@/contexts/ai/application/unlock-ai/messages/UnlockAiMessage';
import { useApplication } from '../ApplicationContext';
import { GoogleMark } from './GoogleMark';

type AiSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfigured?: () => void;
};

const emptyStatus: AiConfigurationStatus = { ready: false, encrypted: false, provider: null, model: null };
const disconnectedGoogle: CloudStorageStatus = { configured: false, connected: false, accountEmail: null, autoUploadExports: false };

export function AiSettingsDialog({ open, onClose, onConfigured }: AiSettingsDialogProps): ReactElement | null {
  const application = useApplication();
  const [status, setStatus] = useState<AiConfigurationStatus>(emptyStatus);
  const [google, setGoogle] = useState<CloudStorageStatus>(disconnectedGoogle);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-5.6-luna');
  const [password, setPassword] = useState('');
  const [storageMode, setStorageMode] = useState<AiCredentialStorageMode>('google-account');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('AI Companion needs your own OpenAI API configuration.');

  useEffect(() => {
    if (!open) return;
    void Promise.all([application.inspectAiConfiguration.inspect(), application.manageCloudStorage.inspect()]).then(async ([next, googleStatus]) => {
      setGoogle(googleStatus);
      let visible = next;
      if (!next.ready && googleStatus.connected && await application.restoreAiFromAccount.restore()) visible = await application.inspectAiConfiguration.inspect();
      setStatus(visible);
      setModel(visible.model ?? 'gpt-5.6-luna');
      setMessage(visible.ready
        ? `OpenAI API is ready for this session${visible.model === null ? '.' : ` with ${visible.model}.`}`
        : visible.encrypted ? 'An encrypted device key is available. Unlock it or replace it below.' : 'Continue with Google to restore an account key, or enter a new OpenAI API key.');
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'AI configuration could not be inspected.'));
  }, [application, open]);

  if (!open) return null;

  const configured = (): void => {
    setApiKey('');
    setPassword('');
    onConfigured?.();
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    try {
      await application.configureAi.configure(new ConfigureAiMessage('openai', model, apiKey, storageMode, storageMode === 'encrypted-device' ? password : null));
      setStatus(await application.inspectAiConfiguration.inspect());
      configured();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'The OpenAI API configuration could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const connectGoogle = async (): Promise<void> => {
    setBusy(true);
    setMessage('Opening Google account selection…');
    try {
      const connected = await application.manageCloudStorage.connect();
      setGoogle(connected);
      const restored = await application.restoreAiFromAccount.restore();
      const next = await application.inspectAiConfiguration.inspect();
      setStatus(next);
      setModel(next.model ?? 'gpt-5.6-luna');
      setMessage(restored ? `Connected as ${connected.accountEmail ?? 'Google account'} and restored the OpenAI key for this session.` : `Connected as ${connected.accountEmail ?? 'Google account'}. No saved OpenAI key was found yet.`);
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : 'Google sign-in was not completed.'); }
    finally { setBusy(false); }
  };

  const unlock = async (): Promise<void> => {
    setBusy(true);
    try {
      await application.unlockAi.unlock(new UnlockAiMessage(password));
      setStatus(await application.inspectAiConfiguration.inspect());
      configured();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'The encrypted OpenAI API key could not be unlocked.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    setBusy(true);
    try {
      await application.removeAi.remove();
      if (google.connected) await application.removeAiFromAccount.remove();
      setStatus(emptyStatus);
      setApiKey('');
      setPassword('');
      setModel('gpt-5.6-luna');
      setMessage(`The OpenAI API key has been removed from this session and device${google.connected ? ' and from your private Google app data' : ''}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading">
          <div><span className="eyebrow">Cloud AI · optional</span><h2 id="ai-settings-title">Configure AI Companion</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close settings">×</button>
        </div>
        <div className="provider-card">
          <strong>OpenAI API</strong>
          <p>The key authorizes requests from RAWcket to the OpenAI API. It is an API Platform credential, not your ChatGPT password or subscription login.</p>
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer noopener">Create or manage an OpenAI API key ↗</a>
        </div>
        <p className="notice warning">When you run a cloud AI action, RAWcket sends reduced JPEG previews and your request to OpenAI. Originals, RAW files, recipes, and keys are not included in project files.</p>

        <div className="google-account-card">
          <div><strong>{google.connected ? `Google account · ${google.accountEmail ?? 'connected'}` : 'Google account'}</strong><small>One connection for private key storage and optional Google Drive backups.</small></div>
          {google.connected
            ? <button className="button ghost" type="button" onClick={() => setStorageMode('google-account')}>Use Google account storage</button>
            : <button className="button google-sign-in" type="button" disabled={busy || !google.configured} onClick={() => void connectGoogle()}><GoogleMark />{google.configured ? 'Continue with Google' : 'Google sign-in unavailable'}</button>}
          {!google.configured && <small>This build needs <code>VITE_GOOGLE_CLIENT_ID</code> configured once by the RAWcket deployer. Users never enter a Client ID or token.</small>}
        </div>

        {status.encrypted && !status.ready && (
          <section className="encrypted-key-panel" aria-label="Unlock encrypted OpenAI API key">
            <strong>Encrypted key found · {status.model ?? 'model not shown'}</strong>
            <label className="field-label" htmlFor="unlock-password">Master password</label>
            <input id="unlock-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            <button className="button ghost full" type="button" disabled={busy || password.length < 12} onClick={() => void unlock()}>Unlock for this session</button>
          </section>
        )}

        <form onSubmit={(event) => void submit(event)}>
          <label className="field-label" htmlFor="ai-provider">AI provider</label>
          <select id="ai-provider" value="openai" disabled><option value="openai">OpenAI API</option></select>
          <label className="field-label" htmlFor="ai-model">OpenAI model</label>
          <input id="ai-model" type="text" required value={model} onChange={(event) => setModel(event.target.value)} autoComplete="off" placeholder="Enter a vision-capable model ID" />
          <small className="muted">The model is explicit and editable so RAWcket never silently chooses one for you.</small>
          <label className="field-label" htmlFor="api-key">OpenAI API key</label>
          <input id="api-key" type="password" required value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" placeholder="sk-… · kept in memory by default" />
          <fieldset className="credential-storage-options">
            <legend>Key storage</legend>
            <label className="check-row">
              <input type="radio" name="credential-storage" value="google-account" checked={storageMode === 'google-account'} disabled={!google.connected} onChange={() => setStorageMode('google-account')} />
              Save in private Google app data · no master password
            </label>
            <label className="check-row">
              <input type="radio" name="credential-storage" value="session" checked={storageMode === 'session'} onChange={() => setStorageMode('session')} />
              This tab only · never saved
            </label>
            <label className="check-row">
              <input type="radio" name="credential-storage" value="encrypted-device" checked={storageMode === 'encrypted-device'} onChange={() => setStorageMode('encrypted-device')} />
              Save encrypted on this device · master password
            </label>
          </fieldset>
          {storageMode === 'encrypted-device' && (
            <>
              <label className="field-label" htmlFor="master-password">New master password (12 characters minimum)</label>
              <input id="master-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
            </>
          )}
          <p className="muted">Google account storage puts the key in this app's hidden <code>appDataFolder</code>, protected by your Google account and inaccessible to normal Drive files or other Drive apps. It is not RAWcket end-to-end encryption. Device storage remains AES-GCM encrypted; session-only keys disappear when this tab closes.</p>
          <p className="status-copy" aria-live="polite">{message}</p>
          <div className="dialog-actions">
            {(status.ready || status.encrypted) && <button className="button ghost danger" type="button" disabled={busy} onClick={() => void remove()}>Remove configuration</button>}
            <button className="button primary" type="submit" disabled={busy || model.trim().length === 0 || apiKey.trim().length < 8 || (storageMode === 'encrypted-device' && password.length < 12) || (storageMode === 'google-account' && !google.connected)}>{busy ? 'Configuring…' : 'Use OpenAI API'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
