import { Timestamp } from '@haskou/value-objects';
import { DuplicateProject } from '@/contexts/projects/application/duplicate-project/DuplicateProject';
import { DuplicateProjectMessage } from '@/contexts/projects/application/duplicate-project/messages/DuplicateProjectMessage';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { AdjustmentKey } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { InMemoryProjectRepository } from '@/contexts/projects/infrastructure/repositories/InMemoryProjectRepository';
import { InMemorySourceFileRepository } from '@/contexts/projects/infrastructure/repositories/InMemorySourceFileRepository';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('DuplicateProject', () => {
  it('copies the recipe and organization but starts a fresh history and identity', async () => {
    const projects = new InMemoryProjectRepository();
    const sources = new InMemorySourceFileRepository();
    const original = PhotoProjectMother.create();
    original.apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'exposure', value: 1, groupId: null }, Timestamp.new(1_750_000_000_001));
    original.apply({ kind: EDIT_OPERATION.SET_PROJECT_RATING, rating: 4, groupId: null }, Timestamp.new(1_750_000_000_002));
    original.apply({ kind: EDIT_OPERATION.SET_PROJECT_TAGS, tags: ['client'], groupId: null }, Timestamp.new(1_750_000_000_003));
    await projects.save(original);
    await sources.save(original.getId(), new Blob(['raw'], { type: 'image/jpeg' }));

    const duplicate = await new DuplicateProject(projects, sources).duplicate(new DuplicateProjectMessage(original.getId().valueOf()));

    expect(duplicate.isIdentifiedBy(original.getId())).toBe(false);
    expect(duplicate.getName().valueOf()).toBe('Test project (copy)');
    expect(duplicate.getGlobalAdjustment(AdjustmentKey.EXPOSURE).valueOf()).toBe(1);
    expect(duplicate.getRating().valueOf()).toBe(4);
    expect(duplicate.getTags().toPrimitives()).toEqual(['client']);
    expect(duplicate.canUndo()).toBe(false);
  });
});
