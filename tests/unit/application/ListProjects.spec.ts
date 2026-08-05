import { Timestamp } from '@haskou/value-objects';
import { ListProjects } from '@/contexts/projects/application/list-projects/ListProjects';
import { ListProjectsMessage } from '@/contexts/projects/application/list-projects/messages/ListProjectsMessage';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { InMemoryProjectRepository } from '@/contexts/projects/infrastructure/repositories/InMemoryProjectRepository';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('ListProjects', () => {
  it('searches project names and tags while enforcing a minimum rating', async () => {
    const repository = new InMemoryProjectRepository();
    const night = PhotoProjectMother.create();
    night.apply({ kind: EDIT_OPERATION.RENAME_PROJECT, name: 'Night portrait', groupId: null }, Timestamp.new(1_750_000_000_001));
    night.apply({ kind: EDIT_OPERATION.SET_PROJECT_TAGS, tags: ['client', 'portrait'], groupId: null }, Timestamp.new(1_750_000_000_002));
    night.apply({ kind: EDIT_OPERATION.SET_PROJECT_RATING, rating: 4, groupId: null }, Timestamp.new(1_750_000_000_003));
    night.apply({ kind: EDIT_OPERATION.SET_PROJECT_FAVORITE, favorite: true, groupId: null }, Timestamp.new(1_750_000_000_004));
    const landscape = PhotoProjectMother.create();
    landscape.apply({ kind: EDIT_OPERATION.RENAME_PROJECT, name: 'Coast', groupId: null }, Timestamp.new(1_750_000_000_005));
    await repository.save(night);
    await repository.save(landscape);
    const list = new ListProjects(repository);

    expect(await list.list(new ListProjectsMessage('portrait', 3))).toHaveLength(1);
    expect(await list.list(new ListProjectsMessage('client', 4))).toHaveLength(1);
    expect(await list.list(new ListProjectsMessage('coast', 3))).toHaveLength(0);
    expect(await list.list(new ListProjectsMessage('', 0, true))).toHaveLength(1);
  });
});
