export type GoogleTokenResponse = { access_token: string; expires_in: number; scope: string; error?: string; error_description?: string };
export type GoogleTokenClient = { requestAccessToken(options?: { prompt?: string }): void };

export type GoogleAccountsOAuth2 = {
  initTokenClient(configuration: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: { type: string }) => void;
  }): GoogleTokenClient;
  revoke(token: string, callback?: () => void): void;
};

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleAccountsOAuth2 } };
  }
}

export {};
