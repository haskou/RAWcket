import { useEffect, useState, type ReactElement } from 'react';
import { ConfigureCloudStorageMessage } from '@/contexts/cloud-storage/application/manage-cloud-storage/messages/ConfigureCloudStorageMessage';
import type { CloudStorageStatus } from '@/contexts/cloud-storage/application/ports/CloudStorageGateway';
import { useApplication } from '../ApplicationContext';
import { GoogleMark } from './GoogleMark';

const disconnected: CloudStorageStatus = { configured: false, connected: false, accountEmail: null, autoUploadExports: false };

export function CloudStorageDialog({ open, onClose, onUploadProject, onUploadOriginal }: {
  open: boolean;
  onClose: () => void;
  onUploadProject?: () => Promise<void>;
  onUploadOriginal?: () => Promise<void>;
}): ReactElement | null {
  const application = useApplication();
  const [status, setStatus] = useState<CloudStorageStatus>(disconnected);
  const [autoUploadExports, setAutoUploadExports] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Continue with Google to use Drive backups and private account settings.');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBusy(true);
    void application.manageCloudStorage.inspect().then((current) => {
      if (cancelled) return;
      setStatus(current);
      setAutoUploadExports(current.autoUploadExports);
      if (current.connected) setMessage(`Connected as ${current.accountEmail ?? 'Google account'}.`);
    }).catch((error: unknown) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : 'Google Drive settings could not be inspected.');
    }).finally(() => {
      if (!cancelled) setBusy(false);
    });
    return () => { cancelled = true; };
  }, [application, open]);

  if (!open) return null;

  const configure = async (enabled: boolean): Promise<void> => {
    const previous = autoUploadExports;
    setAutoUploadExports(enabled);
    setBusy(true);
    try {
      const next = await application.manageCloudStorage.configure(new ConfigureCloudStorageMessage(enabled));
      setStatus(next);
      setMessage(enabled ? 'Future photo exports will also be copied to Google Drive.' : 'Automatic Drive upload is off. Explicit uploads remain available.');
    } catch (error: unknown) {
      setAutoUploadExports(previous);
      setMessage(error instanceof Error ? error.message : 'Google Drive could not be configured.');
    }
    finally { setBusy(false); }
  };

  const connect = async (): Promise<void> => {
    setBusy(true);
    setMessage('Waiting for Google account selection and Drive consent…');
    try {
      const next = await application.manageCloudStorage.connect();
      setStatus(next);
      const restored = await application.restoreAiFromAccount.restore();
      setMessage(`Connected as ${next.accountEmail ?? 'Google account'}.${restored ? ' Your saved OpenAI key is ready for this session.' : ''} Google keeps the account session; RAWcket keeps the short-lived access token only in this tab.`);
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
      <p className="notice warning">Local projects remain the source of truth. Google receives files only when you upload them or enable export upload. Account-stored OpenAI keys stay out of projects and bundles.</p>
      <div className="cloud-connection-card">
        <strong>{status.connected ? `Google account · ${status.accountEmail ?? 'connected'}` : 'Google account'}</strong>
        <p>One Google connection enables Drive backups and the optional private OpenAI key vault. Users never paste a Google token or OAuth Client ID.</p>
        {status.connected ? <button className="button ghost full" type="button" disabled={busy} onClick={() => void disconnect()}>Disconnect Google account</button> : <button className="button google-sign-in full" type="button" disabled={busy || !status.configured} onClick={() => void connect()}><GoogleMark />{busy ? 'Connecting…' : status.configured ? 'Continue with Google' : 'Google sign-in unavailable'}</button>}
        {!status.configured && <small>This build needs <code>VITE_GOOGLE_CLIENT_ID</code> configured once by the RAWcket deployer.</small>}
      </div>
      <label className="check-row"><input type="checkbox" checked={autoUploadExports} disabled={busy || !status.connected} onChange={(event) => void configure(event.target.checked)} /> Automatically upload future photo exports to Drive</label>
      {status.connected && (onUploadProject !== undefined || onUploadOriginal !== undefined) && <div className="cloud-upload-actions">
        {onUploadProject !== undefined && <button className="button ghost" type="button" disabled={busy} onClick={() => void upload(onUploadProject, 'Project bundle')}>Upload project bundle</button>}
        {onUploadOriginal !== undefined && <button className="button ghost" type="button" disabled={busy} onClick={() => void upload(onUploadOriginal, 'Original photograph')}>Upload original</button>}
      </div>}
      <p className="ai-status" aria-live="polite">{message}</p>
      <small className="cloud-scope-note">Scopes: RAWcket-created Drive files (<code>drive.file</code>) and hidden per-app settings (<code>drive.appdata</code>), plus basic Google identity. Photos remain in visible RAWcket folders; the optional OpenAI key is stored separately in private app data.</small>
    </section>
  </div>;
}
