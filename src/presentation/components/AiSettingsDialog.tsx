import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { ConfigureAiMessage } from '@/contexts/ai/application/configure-ai/messages/ConfigureAiMessage';
import type { AiConfigurationStatus } from '@/contexts/ai/application/inspect-ai-configuration/InspectAiConfiguration';
import { UnlockAiMessage } from '@/contexts/ai/application/unlock-ai/messages/UnlockAiMessage';
import { useApplication } from '../ApplicationContext';

type AiSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfigured?: () => void;
};

const emptyStatus: AiConfigurationStatus = { ready: false, encrypted: false, provider: null, model: null };

export function AiSettingsDialog({ open, onClose, onConfigured }: AiSettingsDialogProps): ReactElement | null {
  const application = useApplication();
  const [status, setStatus] = useState<AiConfigurationStatus>(emptyStatus);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [password, setPassword] = useState('');
  const [saveEncrypted, setSaveEncrypted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('AI Companion needs your own OpenAI API configuration.');

  useEffect(() => {
    if (!open) return;
    void application.inspectAiConfiguration.inspect().then((next) => {
      setStatus(next);
      setModel(next.model ?? '');
      setMessage(next.ready
        ? `OpenAI API is ready for this session${next.model === null ? '.' : ` with ${next.model}.`}`
        : next.encrypted ? 'An encrypted OpenAI API key is available. Unlock it or replace it below.' : 'Connect your OpenAI API account to use AI Companion.');
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
      await application.configureAi.configure(new ConfigureAiMessage('openai', model, apiKey, saveEncrypted ? password : null));
      setStatus(await application.inspectAiConfiguration.inspect());
      configured();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'The OpenAI API configuration could not be saved.');
    } finally {
      setBusy(false);
    }
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
      setStatus(emptyStatus);
      setApiKey('');
      setPassword('');
      setModel('');
      setMessage('The OpenAI API key has been removed from this session and device.');
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
          <label className="check-row">
            <input type="checkbox" checked={saveEncrypted} onChange={(event) => setSaveEncrypted(event.target.checked)} />
            Store the key encrypted on this device
          </label>
          {saveEncrypted && (
            <>
              <label className="field-label" htmlFor="master-password">New master password (12 characters minimum)</label>
              <input id="master-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
            </>
          )}
          <p className="muted">Without encrypted storage, the key exists only in memory until this tab is closed. Encryption uses AES-GCM and PBKDF2-SHA-256; RAWcket never stores the master password.</p>
          <p className="status-copy" aria-live="polite">{message}</p>
          <div className="dialog-actions">
            {(status.ready || status.encrypted) && <button className="button ghost danger" type="button" disabled={busy} onClick={() => void remove()}>Remove configuration</button>}
            <button className="button primary" type="submit" disabled={busy || model.trim().length === 0 || apiKey.trim().length < 8}>{busy ? 'Configuring…' : 'Use OpenAI API'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
