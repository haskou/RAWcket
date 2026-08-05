import { Timestamp } from '@haskou/value-objects';
import { CopyDevelopmentSettings } from '@/contexts/projects/application/copy-development-settings/CopyDevelopmentSettings';
import { CopyDevelopmentSettingsMessage } from '@/contexts/projects/application/copy-development-settings/messages/CopyDevelopmentSettingsMessage';
import { PasteDevelopmentSettings } from '@/contexts/projects/application/paste-development-settings/PasteDevelopmentSettings';
import { PasteDevelopmentSettingsMessage } from '@/contexts/projects/application/paste-development-settings/messages/PasteDevelopmentSettingsMessage';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { AdjustmentKey } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { BrowserDevelopmentSettingsClipboard } from '@/contexts/projects/infrastructure/clipboard/BrowserDevelopmentSettingsClipboard';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('Development settings clipboard workflow', () => {
  it('copies only portable settings and pastes them as one undoable operation', async () => {
    let clipboardText = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn((value: string) => { clipboardText = value; return Promise.resolve(); }),
        readText: vi.fn(() => Promise.resolve(clipboardText))
      }
    });
    const project = PhotoProjectMother.create();
    project.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'exposure', value: 1, groupId: null }, Timestamp.now());
    const clipboard = new BrowserDevelopmentSettingsClipboard();

    await new CopyDevelopmentSettings(clipboard).copy(
      project,
      new CopyDevelopmentSettingsMessage(project.getId().valueOf())
    );
    expect(clipboardText).toContain('rawcket-development-settings');
    expect(clipboardText).not.toContain('masks');
    expect(clipboardText).not.toContain('cropFrame');

    project.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'exposure', value: 2, groupId: null }, Timestamp.now());
    await new PasteDevelopmentSettings(clipboard).paste(
      project,
      new PasteDevelopmentSettingsMessage(project.getId().valueOf())
    );
    expect(project.getGlobalAdjustment(AdjustmentKey.EXPOSURE).valueOf()).toBe(1);

    expect(project.undo(Timestamp.now())).toBe(true);
    expect(project.getGlobalAdjustment(AdjustmentKey.EXPOSURE).valueOf()).toBe(2);
  });

  it('rejects unrelated clipboard contents with an actionable error', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: vi.fn(() => Promise.resolve('{"format":"other"}')) }
    });

    await expect(new BrowserDevelopmentSettingsClipboard().read()).rejects.toThrow(/compatible RAWcket/);
  });
});
