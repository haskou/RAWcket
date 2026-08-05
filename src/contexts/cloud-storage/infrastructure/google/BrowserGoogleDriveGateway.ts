import { z } from 'zod';
import type { RawcketSettingsRepository } from '@/shared/infrastructure/settings/RawcketSettingsRepository';
import type { CloudAssetKind, CloudStorageStatus, CloudUploadResult } from '../../application/ports/CloudStorageGateway';
import { CloudStorageGateway } from '../../application/ports/CloudStorageGateway';
import { GoogleIdentityScript } from './GoogleIdentityScript';
import type { GoogleTokenResponse } from './GoogleIdentityTypes';

const configurationSchema = z.object({ clientId: z.string().endsWith('.apps.googleusercontent.com'), autoUploadExports: z.boolean() });
const accountSchema = z.object({ email: z.email() });
const fileSchema = z.object({ id: z.string().min(1), name: z.string().min(1), webViewLink: z.string().url().nullable().optional() });
const fileListSchema = z.object({ files: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })) });

type GoogleDriveConfiguration = z.infer<typeof configurationSchema>;

export class BrowserGoogleDriveGateway extends CloudStorageGateway {
  private static readonly SETTINGS_KEY = 'google-drive-configuration-v1';
  private static readonly SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file';
  private accessToken: string | null = null;
  private expiresAt = 0;
  private accountEmail: string | null = null;
  private readonly folderIds = new Map<string, string>();

  public constructor(private readonly settings: RawcketSettingsRepository, private readonly identity = new GoogleIdentityScript()) { super(); }

  public async inspect(): Promise<CloudStorageStatus> {
    const configuration = await this.configuration();
    return this.status(configuration);
  }

  public async configure(clientId: string, autoUploadExports: boolean): Promise<CloudStorageStatus> {
    const configuration = configurationSchema.parse({ clientId, autoUploadExports });
    const current = await this.configuration();
    if (current?.clientId !== configuration.clientId) this.clearSession();
    await this.settings.save(BrowserGoogleDriveGateway.SETTINGS_KEY, configuration);
    return this.status(configuration);
  }

  public async connect(): Promise<CloudStorageStatus> {
    const configuration = await this.configuration();
    if (configuration === null) throw new Error('Configure a Google OAuth Web Client ID before connecting Drive.');
    await this.identity.load();
    const google = window.google;
    if (google === undefined) throw new Error('Google Identity Services is unavailable.');
    const response = await new Promise<GoogleTokenResponse>((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: configuration.clientId,
        scope: BrowserGoogleDriveGateway.SCOPES,
        callback: (result) => result.error === undefined ? resolve(result) : reject(new Error(result.error_description ?? result.error)),
        error_callback: (error) => reject(new Error(`Google sign-in was not completed (${error.type}).`))
      });
      client.requestAccessToken({ prompt: '' });
    });
    this.accessToken = response.access_token;
    this.expiresAt = Date.now() + Math.max(0, response.expires_in - 60) * 1_000;
    const accountResponse = await this.authorizedFetch('https://openidconnect.googleapis.com/v1/userinfo');
    this.accountEmail = accountSchema.parse(await accountResponse.json()).email;
    return this.status(configuration);
  }

  public async disconnect(): Promise<CloudStorageStatus> {
    const token = this.accessToken;
    if (token !== null && window.google !== undefined) window.google.accounts.oauth2.revoke(token);
    this.clearSession();
    return this.inspect();
  }

  public async upload(name: string, content: Blob, kind: CloudAssetKind): Promise<CloudUploadResult> {
    this.requireToken();
    const root = await this.ensureFolder('RAWcket', 'root');
    const folderName = kind === 'project-bundle' ? 'Projects' : kind === 'original' ? 'Originals' : 'Exports';
    const parent = await this.ensureFolder(folderName, root);
    const boundary = `rawcket-${crypto.randomUUID()}`;
    const metadata = JSON.stringify({ name, parents: [parent], appProperties: { rawcketAssetKind: kind } });
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${content.type || 'application/octet-stream'}\r\n\r\n`,
      content,
      `\r\n--${boundary}--`
    ], { type: `multipart/related; boundary=${boundary}` });
    const response = await this.authorizedFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', { method: 'POST', headers: { 'Content-Type': body.type }, body });
    const uploaded = fileSchema.parse(await response.json());
    return { id: uploaded.id, name: uploaded.name, webViewLink: uploaded.webViewLink ?? null };
  }

  private async ensureFolder(name: string, parent: string): Promise<string> {
    const key = `${parent}/${name}`;
    const cached = this.folderIds.get(key);
    if (cached !== undefined) return cached;
    const query = `name = '${name.replaceAll("'", "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${parent}' in parents and trashed = false`;
    const listResponse = await this.authorizedFetch(`https://www.googleapis.com/drive/v3/files?spaces=drive&fields=files(id,name)&q=${encodeURIComponent(query)}`);
    const existing = fileListSchema.parse(await listResponse.json()).files[0];
    if (existing !== undefined) { this.folderIds.set(key, existing.id); return existing.id; }
    const createResponse = await this.authorizedFetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] })
    });
    const created = fileSchema.parse(await createResponse.json());
    this.folderIds.set(key, created.id);
    return created.id;
  }

  private async authorizedFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const token = this.requireToken();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { ...init, headers });
    if (!response.ok) throw new Error(`Google Drive request failed (${response.status}). Reconnect and try again.`);
    return response;
  }

  private requireToken(): string {
    if (this.accessToken === null || Date.now() >= this.expiresAt) {
      this.clearSession();
      throw new Error('The Google Drive access token expired. Reconnect from a user action and try again.');
    }
    return this.accessToken;
  }

  private async configuration(): Promise<GoogleDriveConfiguration | null> {
    const parsed = configurationSchema.safeParse(await this.settings.get(BrowserGoogleDriveGateway.SETTINGS_KEY));
    return parsed.success ? parsed.data : null;
  }

  private status(configuration: GoogleDriveConfiguration | null): CloudStorageStatus {
    const connected = this.accessToken !== null && Date.now() < this.expiresAt;
    return { configured: configuration !== null, connected, accountEmail: connected ? this.accountEmail : null, clientId: configuration?.clientId ?? null, autoUploadExports: configuration?.autoUploadExports ?? false };
  }

  private clearSession(): void {
    this.accessToken = null;
    this.expiresAt = 0;
    this.accountEmail = null;
    this.folderIds.clear();
  }
}
