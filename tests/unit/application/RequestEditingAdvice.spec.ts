import { RequestEditingAdvice } from '@/contexts/projects/application/request-editing-advice/RequestEditingAdvice';
import { RequestEditingAdviceMessage } from '@/contexts/projects/application/request-editing-advice/messages/RequestEditingAdviceMessage';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { LocalRecipeAdvisor } from '@/contexts/projects/infrastructure/advisors/LocalRecipeAdvisor';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('RequestEditingAdvice', () => {
  it('creates a local, bounded, reviewable cinematic proposal without mutating the project', async () => {
    const project = PhotoProjectMother.create();
    const before = project.toPrimitives();
    const advice = new RequestEditingAdvice(new LocalRecipeAdvisor());

    const proposal = await advice.propose(project, new RequestEditingAdviceMessage(
      project.getId().valueOf(),
      'Create a cinematic night treatment'
    ));

    expect(proposal.explanation).toMatch(/generated locally/);
    expect(proposal.operations.length).toBeGreaterThan(3);
    expect(proposal.operations.every((operation) => operation.kind === EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT)).toBe(true);
    expect(project.toPrimitives()).toEqual(before);
  });

  it('rejects advice requested for another project', () => {
    const project = PhotoProjectMother.create();
    const advice = new RequestEditingAdvice(new LocalRecipeAdvisor());

    expect(() => advice.propose(project, new RequestEditingAdviceMessage(
      crypto.randomUUID(),
      'Recover the highlights'
    ))).toThrow(/different project/);
  });
});
