import type { RawcketDatabaseConnection } from '../database/RawcketDatabase';

export class RawcketSettingsRepository {
  public constructor(private readonly database: Promise<RawcketDatabaseConnection>) {}
  public get(key: string): Promise<unknown> {
    return this.database.then((database) => database.get('settings', key));
  }
  public async save(key: string, value: unknown): Promise<void> {
    await (await this.database).put('settings', value, key);
  }
  public async delete(key: string): Promise<void> {
    await (await this.database).delete('settings', key);
  }
}
