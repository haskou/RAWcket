import { useEffect, useRef, useState, type ReactElement } from 'react';
import { registerSW } from 'virtual:pwa-register';

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

export function PwaUpdateNotice(): ReactElement | null {
  const updateServiceWorker = useRef<UpdateServiceWorker | null>(null);
  const [notice, setNotice] = useState<'offline-ready' | 'update-ready' | null>(null);

  useEffect(() => {
    let reloadForIsolation = !window.crossOriginIsolated;
    const handleControllerChange = (): void => {
      if (!reloadForIsolation) return;
      reloadForIsolation = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    updateServiceWorker.current = registerSW({
      immediate: true,
      onOfflineReady: () => setNotice('offline-ready'),
      onNeedRefresh: () => setNotice('update-ready')
    });
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  if (notice === null) return null;
  const updateReady = notice === 'update-ready';
  return (
    <aside className="pwa-notice" aria-live="polite" aria-label="Application update status">
      <div>
        <strong>{updateReady ? 'A new RAWcket version is ready' : 'RAWcket is ready offline'}</strong>
        <span>{updateReady ? 'Finish or save your current work, then reload when you choose.' : 'The application shell can now open without a connection.'}</span>
      </div>
      <div>
        <button className="button ghost" type="button" onClick={() => setNotice(null)}>{updateReady ? 'Later' : 'Dismiss'}</button>
        {updateReady && <button className="button primary" type="button" onClick={() => void updateServiceWorker.current?.(true)}>Reload now</button>}
      </div>
    </aside>
  );
}
