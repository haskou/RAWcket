import type { EditingAdvisor } from '@/contexts/projects/application/ports/EditingAdvisor';
import { RequestEditingAdvice } from '@/contexts/projects/application/request-editing-advice/RequestEditingAdvice';
import { RequestEditingAdviceMessage } from '@/contexts/projects/application/request-editing-advice/messages/RequestEditingAdviceMessage';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('RequestEditingAdvice', () => {
  it('passes the rendered preview and project context to the configured advisor without mutating the project', async () => {
    const project = PhotoProjectMother.create();
    const before = project.toPrimitives();
    const preview = new Blob(['rendered-preview'], { type: 'image/jpeg' });
    const propose = vi.fn<EditingAdvisor['propose']>().mockResolvedValue({
      suggestedIntent: 'Keep the portrait natural.',
      critique: 'The window competes with the face.',
      strengths: ['Expression'],
      opportunities: ['Window control'],
      explanation: 'Recover the face while protecting the window.',
      operations: [{ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'highlights', value: -25, groupId: null }]
    });

    const proposal = await new RequestEditingAdvice({ propose }).propose(project, new RequestEditingAdviceMessage(
      project.getId().valueOf(), 'Keep the portrait natural', preview
    ));

    expect(propose).toHaveBeenCalledWith(expect.objectContaining({
      intent: 'Keep the portrait natural',
      preview,
      shadowClipping: 0,
      highlightClipping: 0,
      currentCurves: before.recipe.curves,
      currentViewport: before.recipe.viewport,
      existingMaskCount: 0
    }));
    expect(proposal.operations).toHaveLength(1);
    expect(project.toPrimitives()).toEqual(before);
  });

  it('rejects advice requested for another project', () => {
    const project = PhotoProjectMother.create();
    const propose = vi.fn<EditingAdvisor['propose']>();
    expect(() => new RequestEditingAdvice({ propose }).propose(project, new RequestEditingAdviceMessage(
      crypto.randomUUID(), 'Recover the highlights', new Blob(['preview'])
    ))).toThrow(/different project/);
  });
});
