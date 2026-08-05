import { z } from 'zod';
import type { RawcketSettingsRepository } from '../settings/RawcketSettingsRepository';

const encryptedKeySchema = z.object({
  algorithm: z.literal('AES-GCM'),
  derivation: z.literal('PBKDF2-SHA-256'),
  iterations: z.literal(210000),
  salt: z.string(),
  iv: z.string(),
  ciphertext: z.string()
});

export class BrowserApiKeyVault {
  private static readonly SETTINGS_KEY = 'encrypted-api-key';
  private sessionKey: string | null = null;

  public constructor(private readonly settings: RawcketSettingsRepository) {}

  public rememberForSession(apiKey: string): void {
    this.ensureKey(apiKey);
    this.sessionKey = apiKey;
  }

  public getSessionKey(): string | null {
    return this.sessionKey;
  }

  public async saveEncrypted(apiKey: string, password: string): Promise<void> {
    this.ensureKey(apiKey);
    this.ensurePassword(password);
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: this.toArrayBuffer(iv) },
      key,
      this.toArrayBuffer(encoder.encode(apiKey))
    );
    await this.settings.save(BrowserApiKeyVault.SETTINGS_KEY, {
      algorithm: 'AES-GCM',
      derivation: 'PBKDF2-SHA-256',
      iterations: 210000,
      salt: this.toBase64(salt),
      iv: this.toBase64(iv),
      ciphertext: this.toBase64(new Uint8Array(ciphertext))
    });
  }

  public async unlock(password: string): Promise<string> {
    this.ensurePassword(password);
    const encrypted = encryptedKeySchema.parse(await this.settings.get(BrowserApiKeyVault.SETTINGS_KEY));
    try {
      const salt = this.fromBase64(encrypted.salt);
      const iv = this.fromBase64(encrypted.iv);
      const key = await this.deriveKey(password, salt);
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: this.toArrayBuffer(iv) },
        key,
        this.toArrayBuffer(this.fromBase64(encrypted.ciphertext))
      );
      const apiKey = new TextDecoder().decode(plaintext);
      this.rememberForSession(apiKey);
      return apiKey;
    } catch {
      throw new Error('The key could not be unlocked. Check the master password.');
    }
  }

  public async hasEncryptedKey(): Promise<boolean> {
    return encryptedKeySchema.safeParse(await this.settings.get(BrowserApiKeyVault.SETTINGS_KEY)).success;
  }

  public async remove(): Promise<void> {
    this.sessionKey = null;
    await this.settings.delete(BrowserApiKeyVault.SETTINGS_KEY);
  }

  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: this.toArrayBuffer(salt), iterations: 210000 },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private ensureKey(apiKey: string): void {
    if (apiKey.trim().length < 8) throw new Error('The API key appears incomplete.');
  }

  private ensurePassword(password: string): void {
    if (password.length < 12) throw new Error('The master password must contain at least 12 characters.');
  }

  private toBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  private fromBase64(value: string): Uint8Array {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }
}
