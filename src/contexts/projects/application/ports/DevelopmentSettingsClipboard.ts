import type { DevelopmentSettingsPrimitives } from '../../domain/DevelopmentRecipe';

export interface DevelopmentSettingsClipboard {
  write(settings: DevelopmentSettingsPrimitives): Promise<void>;
  read(): Promise<DevelopmentSettingsPrimitives>;
}
