import './GoogleIdentityTypes';

export class GoogleIdentityScript {
  private static loading: Promise<void> | null = null;

  public load(): Promise<void> {
    if (window.google !== undefined) return Promise.resolve();
    GoogleIdentityScript.loading ??= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Identity Services could not be loaded. Check the network and content blockers.'));
      document.head.append(script);
    });
    return GoogleIdentityScript.loading.catch((error: unknown) => {
      GoogleIdentityScript.loading = null;
      throw error;
    });
  }
}
