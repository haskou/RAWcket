import { ManageRecipePresets } from '@/contexts/projects/application/manage-recipe-presets/ManageRecipePresets';
import { CreateRecipePresetMessage } from '@/contexts/projects/application/manage-recipe-presets/messages/CreateRecipePresetMessage';
import { DeleteRecipePresetMessage } from '@/contexts/projects/application/manage-recipe-presets/messages/DeleteRecipePresetMessage';
import { ExportRecipePresetMessage, ImportRecipePresetMessage } from '@/contexts/projects/application/manage-recipe-presets/messages/TransferRecipePresetMessage';
import { UpdateRecipePresetMessage } from '@/contexts/projects/application/manage-recipe-presets/messages/UpdateRecipePresetMessage';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { AdjustmentKey } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { InMemoryRecipePresetRepository } from '@/contexts/projects/infrastructure/repositories/InMemoryRecipePresetRepository';
import { JsonRecipePresetCodec } from '@/contexts/projects/infrastructure/presets/JsonRecipePresetCodec';
import { Timestamp } from '@haskou/value-objects';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('ManageRecipePresets', () => {
  it('creates, revises, exports, imports, and deletes browser recipe presets', async () => {
    const repository = new InMemoryRecipePresetRepository();
    const manager = new ManageRecipePresets(repository, new JsonRecipePresetCodec());
    const project = PhotoProjectMother.create();
    const presetId = crypto.randomUUID();
    const preset = await manager.create(project, new CreateRecipePresetMessage(project.getId().valueOf(), presetId, 'Night portrait', 1_000));
    expect(preset.pullDomainEvents()[0]).toMatchObject({ name: 'RecipePresetWasCreated', occurredAt: 1_000 });

    project.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'contrast', value: 22, groupId: null }, Timestamp.new(2_000));
    await manager.update(project, preset, new UpdateRecipePresetMessage(project.getId().valueOf(), presetId, 'Night portrait v2', true, 3_000));
    expect(preset.getRecipe().getGlobalAdjustment(AdjustmentKey.fromPrimitives('contrast')).valueOf()).toBe(22);

    const blob = manager.export(preset, new ExportRecipePresetMessage(presetId));
    const imported = await manager.import(new ImportRecipePresetMessage(crypto.randomUUID(), new File([blob], 'night.rawcket-recipe.json', { type: 'application/json' }), 4_000));
    expect(imported.getName().valueOf()).toBe('Night portrait v2');
    expect(await manager.list()).toHaveLength(2);

    await manager.remove(new DeleteRecipePresetMessage(presetId));
    expect(await manager.list()).toHaveLength(1);
  });
});
