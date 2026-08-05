import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { ConfigureCloudStorageMessage } from '@/contexts/cloud-storage/application/manage-cloud-storage/messages/ConfigureCloudStorageMessage';
import type { CloudStorageStatus } from '@/contexts/cloud-storage/application/ports/CloudStorageGateway';
import { useApplication } from '../ApplicationContext';

const disconnected: CloudStorageStatus = { configured: false, connected: false, accountEmail: null, clientId: null, autoUploadExports: false };

export function CloudStorageDialog({ open, onClose, onUploadProject, onUploadOriginal }: {
  open: boolean;
  onClose: () => void;
  onUploadProject?: () => Promise<void>;
  onUploadOriginal?: () => Promise<void>;
}): ReactElement | null {
  const application = useApplication();
  const [status, setStatus] = useState<CloudStorageStatus>(disconnected);
  const [clientId, setClientId] = useState('');
  const [autoUploadExports, setAutoUploadExports] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Configure your own Google OAuth Web Client ID. RAWcket ships with no shared Google credential.');
  const draftTouched = useRef(false);

  useEffect(() => {
    if (!open) {
      draftTouched.current = false;
      return;
    }
    let cancelled = false;
    setBusy(true);
    void application.manageCloudStorage.inspect().then((current) => {
      if (cancelled) return;
      setStatus(current);
      if (!draftTouched.current) {
        setClientId(current.clientId ?? '');
        setAutoUploadExports(current.autoUploadExports);
      }
      if (current.connected) setMessage(`Connected as ${current.accountEmail ?? 'Google account'}.`);
    }).catch((error: unknown) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : 'Google Drive settings could not be inspected.');
    }).finally(() => {
      if (!cancelled) setBusy(false);
    });
    return () => { cancelled = true; };
  }, [application, open]);

  if (!open) return null;

  const configure = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    try {
      const next = await application.manageCloudStorage.configure(new ConfigureCloudStorageMessage(clientId, autoUploadExports));
      setStatus(next);
      setMessage('Google Drive configuration saved locally. Connect from the button below when you want to use it.');
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : 'Google Drive could not be configured.'); }
    finally { setBusy(false); }
  };

  const connect = async (): Promise<void> => {
    setBusy(true);
    setMessage('Waiting for Google account selection and Drive consent…');
    try {
      const next = await application.manageCloudStorage.connect();
      setStatus(next);
      setMessage(`Connected as ${next.accountEmail ?? 'Google account'}. Google keeps the account session; RAWcket keeps the short-lived access token only in this tab.`);
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : 'Google sign-in was not completed.'); }
    finally { setBusy(false); }
  };

  const disconnect = async (): Promise<void> => {
    setBusy(true);
    try { setStatus(await application.manageCloudStorage.disconnect()); setMessage('Google Drive disconnected and the in-memory access token was revoked.'); }
    finally { setBusy(false); }
  };

  const upload = async (action: (() => Promise<void>) | undefined, label: string): Promise<void> => {
    if (action === undefined) return;
    setBusy(true);
    setMessage(`Uploading ${label} to Google Drive…`);
    try { await action(); setMessage(`${label} uploaded to the RAWcket folder in Google Drive.`); }
    catch (error: unknown) { setMessage(error instanceof Error ? error.message : `${label} could not be uploaded.`); }
    finally { setBusy(false); }
  };

  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="dialog cloud-storage-dialog" role="dialog" aria-modal="true" aria-labelledby="cloud-storage-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="dialog-heading"><div><span className="eyebrow">Optional cloud storage</span><h2 id="cloud-storage-title">Google Drive</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close Google Drive settings">×</button></div>
      <p className="notice warning">Local projects remain the source of truth. Google receives a file only when you upload it or enable export upload. OpenAI keys and Google access tokens never enter projects or bundles.</p>
      <form onSubmit={(event) => void configure(event)}>
        <label className="field-label" htmlFor="google-client-id">Google OAuth Web Client ID</label>
        <input id="google-client-id" type="text" value={clientId} disabled={busy} placeholder="123…apps.googleusercontent.com" onChange={(event) => { draftTouched.current = true; setClientId(event.target.value); }} />
        <a className="provider-setup-link" href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noreferrer noopener">Create or manage a Google OAuth client ↗</a>
        <label className="check-row"><input type="checkbox" checked={autoUploadExports} disabled={busy} onChange={(event) => { draftTouched.current = true; setAutoUploadExports(event.target.checked); }} /> Automatically upload future photo exports</label>
        <button className="button ghost full" type="submit" disabled={busy || clientId.trim().length === 0}>Save Google configuration</button>
      </form>
      <div className="cloud-connection-card">
        <strong>{status.connected ? `Connected · ${status.accountEmail ?? 'Google account'}` : status.configured ? 'Configured · not connected' : 'Not configured'}</strong>
        <p>Google Identity Services uses the account session already open in your browser. Access tokens are short-lived and tab-only, so reconnecting may be required without re-entering your Google password.</p>
        {status.connected ? <button className="button ghost full" type="button" disabled={busy} onClick={() => void disconnect()}>Disconnect Google Drive</button> : <button className="button primary full" type="button" disabled={busy || !status.configured} onClick={() => void connect()}>{busy ? 'Connecting…' : 'Connect Google Drive'}</button>}
      </div>
      {status.connected && (onUploadProject !== undefined || onUploadOriginal !== undefined) && <div className="cloud-upload-actions">
        {onUploadProject !== undefined && <button className="button ghost" type="button" disabled={busy} onClick={() => void upload(onUploadProject, 'Project bundle')}>Upload project bundle</button>}
        {onUploadOriginal !== undefined && <button className="button ghost" type="button" disabled={busy} onClick={() => void upload(onUploadOriginal, 'Original photograph')}>Upload original</button>}
      </div>}
      <p className="ai-status" aria-live="polite">{message}</p>
      <small className="cloud-scope-note">Scope: Drive files created by RAWcket (<code>drive.file</code>), plus basic Google identity. Files are stored in visible RAWcket/Projects, RAWcket/Originals, and RAWcket/Exports folders.</small>
    </section>
  </div>;
}
