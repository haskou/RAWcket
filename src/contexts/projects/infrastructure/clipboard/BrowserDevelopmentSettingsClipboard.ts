import type { DevelopmentSettingsClipboard } from '../../application/ports/DevelopmentSettingsClipboard';
import type { DevelopmentSettingsPrimitives } from '../../domain/DevelopmentRecipe';
import { developmentSettingsSchema } from '../serialization/ProjectSchemas';

export class BrowserDevelopmentSettingsClipboard implements DevelopmentSettingsClipboard {
  public async write(settings: DevelopmentSettingsPrimitives): Promise<void> {
    await navigator.clipboard.writeText(JSON.stringify({
      format: 'rawcket-development-settings',
      formatVersion: 1,
      settings: developmentSettingsSchema.parse(settings)
    }, null, 2));
  }

  public async read(): Promise<DevelopmentSettingsPrimitives> {
    let raw: unknown;
    try {
      raw = JSON.parse(await navigator.clipboard.readText());
    } catch {
      throw new Error('The clipboard does not contain valid RAWcket development settings.');
    }
    if (typeof raw !== 'object' || raw === null || !('format' in raw) || raw.format !== 'rawcket-development-settings' || !('formatVersion' in raw) || raw.formatVersion !== 1 || !('settings' in raw)) {
      throw new Error('The clipboard does not contain compatible RAWcket development settings.');
    }
    return developmentSettingsSchema.parse(raw.settings);
  }
}
