import { useEffect, useState, type ReactElement } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function PwaUpdateNotice(): ReactElement | null {
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let reloadForUpdate = navigator.serviceWorker.controller !== null;
    const handleControllerChange = (): void => {
      if (!reloadForUpdate) return;
      reloadForUpdate = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    registerSW({
      immediate: true,
      onOfflineReady: () => setOfflineReady(true)
    });
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  if (!offlineReady) return null;
  return (
    <aside className="pwa-notice" aria-live="polite" aria-label="Application update status">
      <div>
        <strong>RAWcket is ready offline</strong>
        <span>The application shell can now open without a connection. New versions install automatically.</span>
      </div>
      <div>
        <button className="button ghost" type="button" onClick={() => setOfflineReady(false)}>Dismiss</button>
      </div>
    </aside>
  );
}
