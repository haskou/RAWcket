import { DecideAiDevelopmentAdvice } from '@/contexts/projects/application/decide-ai-development-advice/DecideAiDevelopmentAdvice';
import { DecideAiDevelopmentAdviceMessage } from '@/contexts/projects/application/decide-ai-development-advice/messages/DecideAiDevelopmentAdviceMessage';
import { RecordAiDevelopmentAdvice } from '@/contexts/projects/application/record-ai-development-advice/RecordAiDevelopmentAdvice';
import { RecordAiDevelopmentAdviceMessage } from '@/contexts/projects/application/record-ai-development-advice/messages/RecordAiDevelopmentAdviceMessage';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('AI development advice', () => {
  it('records and decides a bounded proposal inside the project aggregate', () => {
    const project = PhotoProjectMother.create();
    const adviceId = crypto.randomUUID();
    project.pullDomainEvents();

    new RecordAiDevelopmentAdvice().record(project, new RecordAiDevelopmentAdviceMessage(
      project.getId().valueOf(),
      adviceId,
      'Give this portrait a quieter cinematic direction.',
      'Build a quiet cinematic portrait.',
      'The face has useful separation from the background.',
      ['Readable subject'],
      ['Tighter crop'],
      'A restrained crop and highlight reduction improve hierarchy.',
      [{ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'highlights', value: -20, groupId: null }],
      1_750_000_000_000
    ));

    expect(project.getAiDevelopmentJournal().advice[0]).toMatchObject({
      id: adviceId,
      request: 'Give this portrait a quieter cinematic direction.',
      suggestedIntent: 'Build a quiet cinematic portrait.',
      status: 'proposed'
    });
    expect(project.pullDomainEvents()).toEqual([{ name: 'PhotoProjectWasChanged', projectId: project.getId().valueOf(), occurredAt: 1_750_000_000_000 }]);

    new DecideAiDevelopmentAdvice().decide(project, new DecideAiDevelopmentAdviceMessage(
      project.getId().valueOf(),
      adviceId,
      'applied',
      1_750_000_001_000
    ));

    expect(project.getAiDevelopmentJournal().advice[0]?.status).toBe('applied');
    expect(() => new DecideAiDevelopmentAdvice().decide(project, new DecideAiDevelopmentAdviceMessage(
      project.getId().valueOf(), adviceId, 'rejected'
    ))).toThrow(/cannot be decided again/);
  });

  it('rejects advice addressed to another project', () => {
    const project = PhotoProjectMother.create();
    const message = new RecordAiDevelopmentAdviceMessage(
      crypto.randomUUID(),
      crypto.randomUUID(),
      '',
      'Improve the frame.',
      'The frame can be simplified.',
      [],
      ['Simpler crop'],
      'Crop around the main subject.',
      [{ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'contrast', value: 8, groupId: null }]
    );

    expect(() => new RecordAiDevelopmentAdvice().record(project, message)).toThrow(/different project/);
  });
});
