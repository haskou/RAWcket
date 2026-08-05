import { SuggestAutomaticEnhancement } from '@/contexts/projects/application/suggest-automatic-enhancement/SuggestAutomaticEnhancement';
import { SuggestAutomaticEnhancementMessage } from '@/contexts/projects/application/suggest-automatic-enhancement/messages/SuggestAutomaticEnhancementMessage';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('SuggestAutomaticEnhancement', () => {
  const useCase = new SuggestAutomaticEnhancement();

  it('leaves an unclipped photograph unchanged', () => {
    const project = PhotoProjectMother.create();
    const suggestion = useCase.suggest(project, new SuggestAutomaticEnhancementMessage(project.getId().valueOf(), 0.004, 0.006));

    expect(suggestion.operation).toBeNull();
    expect(suggestion.explanation).toContain('left the recipe unchanged');
  });

  it('adds only conservative clipping corrections while preserving existing settings', () => {
    const project = PhotoProjectMother.create();
    const suggestion = useCase.suggest(project, new SuggestAutomaticEnhancementMessage(project.getId().valueOf(), 0.04, 0.025));

    expect(suggestion.operation?.kind).toBe(EDIT_OPERATION.REPLACE_DEVELOPMENT_SETTINGS);
    if (suggestion.operation?.kind !== EDIT_OPERATION.REPLACE_DEVELOPMENT_SETTINGS) throw new Error('Expected development settings.');
    expect(suggestion.operation.settings.globalAdjustments).toEqual(expect.objectContaining({ highlights: -5, shadows: 6, texture: 0, sharpness: 0 }));
    expect(suggestion.changedAdjustments).toEqual(['highlights', 'shadows']);
  });

  it('rejects an analysis for another project', () => {
    const project = PhotoProjectMother.create();
    expect(() => useCase.suggest(project, new SuggestAutomaticEnhancementMessage(crypto.randomUUID(), 0, 0))).toThrow(/different project/);
  });
});
