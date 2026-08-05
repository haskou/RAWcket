import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { useApplication } from '../ApplicationContext';

export function AiSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement | null {
  const { apiKeyVault } = useApplication();
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [rememberSession, setRememberSession] = useState(true);
  const [saveEncrypted, setSaveEncrypted] = useState(false);
  const [hasEncryptedKey, setHasEncryptedKey] = useState(false);
  const [message, setMessage] = useState('IA desactivada. No hay ningun proveedor conectado.');

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
      setMessage('Clave guardada segun tus opciones. La IA sigue desactivada hasta configurar un proveedor.');
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la clave.');
    }
  };

  const remove = async (): Promise<void> => {
    await apiKeyVault.remove();
    setApiKey('');
    setPassword('');
    setHasEncryptedKey(false);
    setMessage('La clave se ha eliminado de la sesion y del dispositivo.');
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">Privacidad primero</span>
            <h2 id="ai-settings-title">Configuracion de IA</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar configuracion">×</button>
        </div>
        <p className="notice warning">Guardar una API key en un navegador compartido implica riesgo. El cifrado real exige una contrasena maestra que RAWcket no almacena.</p>
        <form onSubmit={(event) => void submit(event)}>
          <label className="field-label" htmlFor="api-key">API key</label>
          <input id="api-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" placeholder="No se registra ni se anade al proyecto" />
          <label className="check-row">
            <input type="checkbox" checked={rememberSession} onChange={(event) => setRememberSession(event.target.checked)} />
            Recordar solo durante esta sesion
          </label>
          <label className="check-row">
            <input type="checkbox" checked={saveEncrypted} onChange={(event) => setSaveEncrypted(event.target.checked)} />
            Guardar cifrada en este dispositivo
          </label>
          {saveEncrypted && (
            <>
              <label className="field-label" htmlFor="master-password">Contrasena maestra (minimo 12 caracteres)</label>
              <input id="master-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
            </>
          )}
          <p className="muted">Cifrado: AES-GCM; derivacion: PBKDF2-SHA-256, 210.000 iteraciones. Clave cifrada presente: {hasEncryptedKey ? 'si' : 'no'}.</p>
          <p className="status-copy" aria-live="polite">{message}</p>
          <div className="dialog-actions">
            <button className="button ghost danger" type="button" onClick={() => void remove()}>Eliminar clave</button>
            <button className="button primary" type="submit">Guardar opciones</button>
          </div>
        </form>
      </section>
    </div>
  );
}
