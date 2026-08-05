import { BrowserGoogleDriveGateway } from '@/contexts/cloud-storage/infrastructure/google/BrowserGoogleDriveGateway';
import type { GoogleTokenResponse } from '@/contexts/cloud-storage/infrastructure/google/GoogleIdentityTypes';
import type { RawcketSettingsRepository } from '@/shared/infrastructure/settings/RawcketSettingsRepository';
import { AiModel } from '@/contexts/ai/domain/AiModel';
import { AiProvider } from '@/contexts/ai/domain/AiProvider';

describe('BrowserGoogleDriveGateway', () => {
  let settings: RawcketSettingsRepository;
  let save: ReturnType<typeof vi.fn>;
  let stored: unknown;

  beforeEach(() => {
    stored = null;
    save = vi.fn((_key: string, value: unknown) => { stored = value; return Promise.resolve(); });
    settings = {
      get: vi.fn(() => Promise.resolve(stored)),
      save,
      delete: vi.fn(() => Promise.resolve())
    } as unknown as RawcketSettingsRepository;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.google;
  });

  it('keeps the access token in memory and uploads into visible RAWcket folders', async () => {
    let tokenCallback: ((response: GoogleTokenResponse) => void) | null = null;
    window.google = { accounts: { oauth2: {
      initTokenClient: (configuration) => {
        tokenCallback = configuration.callback;
        return { requestAccessToken: () => tokenCallback?.({ access_token: 'google-access-token', expires_in: 3_600, scope: 'drive.file' }) };
      },
      revoke: vi.fn()
    } } };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const authorization = new Headers(init?.headers).get('Authorization');
      expect(authorization).toBe('Bearer google-access-token');
      if (url.includes('userinfo')) return Promise.resolve(new Response(JSON.stringify({ email: 'photographer@example.com' }), { status: 200 }));
      if (url.includes('spaces=drive')) return Promise.resolve(new Response(JSON.stringify({ files: [] }), { status: 200 }));
      if (url.includes('uploadType=multipart')) return Promise.resolve(new Response(JSON.stringify({ id: 'photo-id', name: 'portrait.jpg', webViewLink: 'https://drive.google.com/file/d/photo-id/view' }), { status: 200 }));
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) as { name?: string } : {};
      return Promise.resolve(new Response(JSON.stringify({ id: body.name === 'RAWcket' ? 'root-id' : 'exports-id', name: body.name }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const gateway = new BrowserGoogleDriveGateway(settings, '123-example.apps.googleusercontent.com');

    await gateway.configure(true);
    const connected = await gateway.connect();
    const result = await gateway.upload('portrait.jpg', new Blob(['pixels'], { type: 'image/jpeg' }), 'photo-export');

    expect(connected).toMatchObject({ connected: true, accountEmail: 'photographer@example.com', autoUploadExports: true });
    expect(result).toMatchObject({ id: 'photo-id', name: 'portrait.jpg' });
    expect(save).toHaveBeenCalledWith('google-drive-configuration-v1', { autoUploadExports: true });
    expect(JSON.stringify(stored)).not.toContain('google-access-token');
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('stores and restores an OpenAI credential from private Google app data', async () => {
    window.google = { accounts: { oauth2: {
      initTokenClient: (configuration) => ({ requestAccessToken: () => configuration.callback({ access_token: 'account-token', expires_in: 3_600, scope: 'drive.appdata' }) }),
      revoke: vi.fn()
    } } };
    let stored = false;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('userinfo')) return Promise.resolve(new Response(JSON.stringify({ email: 'account@example.com' }), { status: 200 }));
      if (url.includes('spaces=appDataFolder')) return Promise.resolve(new Response(JSON.stringify({ files: stored ? [{ id: 'credential-id', name: 'rawcket-openai-credential-v1.json' }] : [] }), { status: 200 }));
      if (url.includes('uploadType=multipart')) { stored = true; return Promise.resolve(new Response(JSON.stringify({ id: 'credential-id', name: 'rawcket-openai-credential-v1.json' }), { status: 200 })); }
      if (url.includes('credential-id?alt=media')) return Promise.resolve(new Response(JSON.stringify({ formatVersion: 1, provider: 'openai', model: 'gpt-5.6-luna', apiKey: 'sk-account-secret' }), { status: 200 }));
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const gateway = new BrowserGoogleDriveGateway(settings, '123-example.apps.googleusercontent.com');
    await gateway.connect();

    await gateway.save({ provider: AiProvider.OPENAI, model: new AiModel('gpt-5.6-luna'), apiKey: 'sk-account-secret' });
    const restored = await gateway.find();

    expect(restored?.apiKey).toBe('sk-account-secret');
    expect(restored?.model.valueOf()).toBe('gpt-5.6-luna');
  });
});
