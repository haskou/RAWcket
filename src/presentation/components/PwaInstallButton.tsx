import { useEffect, useState, type ReactElement } from 'react';

type InstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

type InstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<InstallChoice>;
};

export function PwaInstallButton(): ReactElement | null {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const offerInstallation = (event: Event): void => {
      if (!isInstallPromptEvent(event)) return;
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', offerInstallation);
    return () => window.removeEventListener('beforeinstallprompt', offerInstallation);
  }, []);

  if (installPrompt === null) return null;

  const install = async (): Promise<void> => {
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
    }
  };

  return <button className="button ghost pwa-install-button" type="button" onClick={() => void install()}>Install app</button>;
}

function isInstallPromptEvent(event: Event): event is InstallPromptEvent {
  return typeof Reflect.get(event, 'prompt') === 'function' && Reflect.get(event, 'userChoice') instanceof Promise;
}
