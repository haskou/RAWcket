import { Timestamp } from '@haskou/value-objects';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('Project organization', () => {
  it('validates, normalizes, serializes, and undoes ratings and tags', () => {
    const project = PhotoProjectMother.create();
    project.apply({ kind: EDIT_OPERATION.SET_PROJECT_RATING, rating: 5, groupId: null }, Timestamp.new(1_750_000_000_001));
    project.apply({ kind: EDIT_OPERATION.SET_PROJECT_TAGS, tags: [' Portrait ', 'Client', 'portrait'], groupId: null }, Timestamp.new(1_750_000_000_002));

    expect(project.getRating().valueOf()).toBe(5);
    expect(project.getTags().toPrimitives()).toEqual(['portrait', 'client']);
    expect(project.toPrimitives().organization).toEqual({ rating: 5, tags: ['portrait', 'client'] });

    project.undo(Timestamp.new(1_750_000_000_003));
    expect(project.getTags().toPrimitives()).toEqual([]);
    expect(() => project.apply({ kind: EDIT_OPERATION.SET_PROJECT_RATING, rating: 6, groupId: null }, Timestamp.new(1_750_000_000_004))).toThrow(/between 0 and 5/);
  });
});
