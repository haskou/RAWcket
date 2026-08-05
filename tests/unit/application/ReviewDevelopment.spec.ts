import { mock } from 'jest-mock-extended';
import { ReviewDevelopment } from '@/contexts/projects/application/review-development/ReviewDevelopment';
import { ReviewDevelopmentMessage } from '@/contexts/projects/application/review-development/messages/ReviewDevelopmentMessage';
import type { DevelopmentTutor } from '@/contexts/projects/application/ports/DevelopmentTutor';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('ReviewDevelopment', () => {
  it('builds tutor context from the requested aggregate and measured frame', () => {
    const tutor = mock<DevelopmentTutor>();
    tutor.review.mockReturnValue([]);
    const project = PhotoProjectMother.create();
    const review = new ReviewDevelopment(tutor);

    review.review(project, new ReviewDevelopmentMessage(project.getId().valueOf(), 0.02, 0.03));

    expect(tutor.review).toHaveBeenCalledWith(expect.objectContaining({
      shadowClipping: 0.02,
      highlightClipping: 0.03,
      adjustments: expect.objectContaining({ exposure: 0, highlights: 0, noiseReduction: 0 })
    }));
  });
});
