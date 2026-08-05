import { ReviewDevelopment } from '@/contexts/projects/application/review-development/ReviewDevelopment';
import { ReviewDevelopmentMessage } from '@/contexts/projects/application/review-development/messages/ReviewDevelopmentMessage';
import { LocalDevelopmentTutor } from '@/contexts/projects/infrastructure/advisors/LocalDevelopmentTutor';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('ReviewDevelopment', () => {
  it('reviews the requested aggregate against measured frame data', () => {
    const project = PhotoProjectMother.create();
    const review = new ReviewDevelopment(new LocalDevelopmentTutor());

    const guidance = review.review(
      project,
      new ReviewDevelopmentMessage(project.getId().valueOf(), 0.02, 0.03)
    );

    expect(guidance).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Highlights touch the output ceiling' }),
      expect.objectContaining({ title: 'Some shadows have no output detail' })
    ]));
  });
});
