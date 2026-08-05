import { Queue, QueueOptions } from '@haskou/flow';
import { Timestamp } from '@haskou/value-objects';
import { PendingProjectAssetMutation, ProjectAssetMutationKind, type ProjectAssetJournal } from '@/contexts/projects/application/ports/ProjectAssetJournal';
import { ReconcileProjectAssets } from '@/contexts/projects/application/reconcile-project-assets/ReconcileProjectAssets';
import { ProjectId } from '@/contexts/projects/domain/value-objects/ProjectId';
import { InMemoryProjectRepository } from '@/contexts/projects/infrastructure/repositories/InMemoryProjectRepository';
import { InMemorySourceFileRepository } from '@/contexts/projects/infrastructure/repositories/InMemorySourceFileRepository';

describe('ReconcileProjectAssets', () => {
  it('removes only a source proven orphaned by an interrupted create journal', async () => {
    const projects = new InMemoryProjectRepository();
    const sources = new InMemorySourceFileRepository();
    const projectId = new ProjectId(crypto.randomUUID());
    await sources.save(projectId, new Blob(['orphan'], { type: 'image/jpeg' }));
    const complete = vi.fn(() => Promise.resolve());
    const journal: ProjectAssetJournal = {
      begin: vi.fn(() => Promise.resolve()),
      complete,
      findPending: vi.fn(() => Promise.resolve([new PendingProjectAssetMutation(projectId, ProjectAssetMutationKind.CREATE, Timestamp.now())]))
    };

    const result = await new ReconcileProjectAssets(projects, sources, journal, new Queue(QueueOptions.withConcurrency(1))).reconcile();

    expect(result).toEqual({ recoveredMutations: 1, removedOrphanedSources: 1, missingReferencedSources: 0 });
    expect(await sources.find(projectId)).toBeNull();
    expect(complete).toHaveBeenCalledWith(projectId);
  });
});
