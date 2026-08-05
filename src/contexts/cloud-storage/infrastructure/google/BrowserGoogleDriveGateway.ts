import { z } from 'zod';
import type { AiCredentialAccountRepository } from '@/contexts/ai/application/ports/AiCredentialAccountRepository';
import type { AiCredential } from '@/contexts/ai/application/ports/AiCredentialVault';
import { AiModel } from '@/contexts/ai/domain/AiModel';
import { AiProvider } from '@/contexts/ai/domain/AiProvider';
import type { RawcketSettingsRepository } from '@/shared/infrastructure/settings/RawcketSettingsRepository';
import type { CloudAssetKind, CloudStorageGateway, CloudStorageStatus, CloudUploadResult } from '../../application/ports/CloudStorageGateway';
import { GoogleIdentityScript } from './GoogleIdentityScript';
import type { GoogleTokenResponse } from './GoogleIdentityTypes';

const configurationSchema = z.object({ autoUploadExports: z.boolean() });
const accountSchema = z.object({ email: z.email() });
const fileSchema = z.object({ id: z.string().min(1), name: z.string().min(1), webViewLink: z.string().url().nullable().optional() });
const fileListSchema = z.object({ files: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })) });
const accountCredentialSchema = z.object({ formatVersion: z.literal(1), provider: z.literal('openai'), model: z.string().min(1).max(100), apiKey: z.string().min(8).max(500) });

type GoogleDriveConfiguration = z.infer<typeof configurationSchema>;

export class BrowserGoogleDriveGateway implements CloudStorageGateway, AiCredentialAccountRepository {
  private static readonly SETTINGS_KEY = 'google-drive-configuration-v1';
  private static readonly CREDENTIAL_FILE = 'rawcket-openai-credential-v1.json';
  private static readonly SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata';
  private accessToken: string | null = null;
  private expiresAt = 0;
  private accountEmail: string | null = null;
  private readonly folderIds = new Map<string, string>();

  public constructor(
    private readonly settings: RawcketSettingsRepository,
    private readonly clientId: string,
    private readonly identity = new GoogleIdentityScript()
  ) {}

  public async inspect(): Promise<CloudStorageStatus> { return this.status(await this.configuration()); }

  public async configure(autoUploadExports: boolean): Promise<CloudStorageStatus> {
    const configuration = configurationSchema.parse({ autoUploadExports });
    await this.settings.save(BrowserGoogleDriveGateway.SETTINGS_KEY, configuration);
    return this.status(configuration);
  }

  public async connect(): Promise<CloudStorageStatus> {
    if (!this.isConfigured()) throw new Error('Google sign-in is not configured for this RAWcket deployment. Set VITE_GOOGLE_CLIENT_ID when building the app.');
    await this.identity.load();
    const google = window.google;
    if (google === undefined) throw new Error('Google Identity Services is unavailable.');
    const response = await new Promise<GoogleTokenResponse>((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
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
    return this.status(await this.configuration());
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
    const uploaded = await this.multipartUpload({ name, parents: [parent], appProperties: { rawcketAssetKind: kind } }, content, 'id,name,webViewLink');
    return { id: uploaded.id, name: uploaded.name, webViewLink: uploaded.webViewLink ?? null };
  }

  public async find(): Promise<AiCredential | null> {
    const fileId = await this.findAppDataFile();
    if (fileId === null) return null;
    const response = await this.authorizedFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    const stored = accountCredentialSchema.parse(await response.json());
    return { provider: AiProvider.fromPrimitives(stored.provider), model: new AiModel(stored.model), apiKey: stored.apiKey };
  }

  public async save(credential: AiCredential): Promise<void> {
    const content = new Blob([JSON.stringify({ formatVersion: 1, provider: credential.provider.valueOf(), model: credential.model.valueOf(), apiKey: credential.apiKey })], { type: 'application/json' });
    const fileId = await this.findAppDataFile();
    if (fileId === null) {
      await this.multipartUpload({ name: BrowserGoogleDriveGateway.CREDENTIAL_FILE, parents: ['appDataFolder'] }, content, 'id,name');
      return;
    }
    await this.authorizedFetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: content });
  }

  public async remove(): Promise<void> {
    const fileId = await this.findAppDataFile();
    if (fileId !== null) await this.authorizedFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, { method: 'DELETE' });
  }

  private async findAppDataFile(): Promise<string | null> {
    const query = `name = '${BrowserGoogleDriveGateway.CREDENTIAL_FILE}' and trashed = false`;
    const response = await this.authorizedFetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&q=${encodeURIComponent(query)}`);
    return fileListSchema.parse(await response.json()).files[0]?.id ?? null;
  }

  private async multipartUpload(metadata: object, content: Blob, fields: string): Promise<z.infer<typeof fileSchema>> {
    const boundary = `rawcket-${crypto.randomUUID()}`;
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${content.type || 'application/octet-stream'}\r\n\r\n`,
      content,
      `\r\n--${boundary}--`
    ], { type: `multipart/related; boundary=${boundary}` });
    const response = await this.authorizedFetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${encodeURIComponent(fields)}`, { method: 'POST', headers: { 'Content-Type': body.type }, body });
    return fileSchema.parse(await response.json());
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
      throw new Error('Your Google session expired. Continue with Google again and retry.');
    }
    return this.accessToken;
  }

  private async configuration(): Promise<GoogleDriveConfiguration> {
    const parsed = configurationSchema.safeParse(await this.settings.get(BrowserGoogleDriveGateway.SETTINGS_KEY));
    return parsed.success ? parsed.data : { autoUploadExports: false };
  }

  private status(configuration: GoogleDriveConfiguration): CloudStorageStatus {
    const connected = this.accessToken !== null && Date.now() < this.expiresAt;
    return { configured: this.isConfigured(), connected, accountEmail: connected ? this.accountEmail : null, autoUploadExports: configuration.autoUploadExports };
  }

  private isConfigured(): boolean { return this.clientId.trim().endsWith('.apps.googleusercontent.com'); }

  private clearSession(): void {
    this.accessToken = null;
    this.expiresAt = 0;
    this.accountEmail = null;
    this.folderIds.clear();
  }
}
