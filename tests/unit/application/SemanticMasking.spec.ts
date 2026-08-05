import { CreateSemanticMask } from '@/contexts/projects/application/create-semantic-mask/CreateSemanticMask';
import { CreateSemanticMaskMessage } from '@/contexts/projects/application/create-semantic-mask/messages/CreateSemanticMaskMessage';
import { ManageSemanticSegmentationModel } from '@/contexts/projects/application/manage-semantic-segmentation-model/ManageSemanticSegmentationModel';
import type {
  SemanticMaskSuggestion,
  SemanticModelDescriptor,
  SemanticModelStatus,
  SemanticModelTaskOptions,
  SemanticSegmentationModel
} from '@/contexts/projects/application/ports/SemanticSegmentationModel';
import type { SemanticMaskCategory } from '@/contexts/projects/domain/value-objects/SemanticMaskCategory';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

class ControllableSemanticModel implements SemanticSegmentationModel {
  public status: SemanticModelStatus = 'not-installed';
  public removed = false;

  public describe(): SemanticModelDescriptor {
    return { id: 'local/model', version: 'pinned', approximateDownloadBytes: 42, supportedCategories: ['sky'] };
  }

  public inspect(): Promise<SemanticModelStatus> { return Promise.resolve(this.status); }

  public install(options: SemanticModelTaskOptions): Promise<void> {
    if (options.signal.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
    this.status = 'installed';
    options.onProgress?.(1);
    return Promise.resolve();
  }

  public remove(): Promise<void> {
    this.removed = true;
    this.status = 'not-installed';
    return Promise.resolve();
  }

  public suggest(_image: Blob, _category: SemanticMaskCategory, options: SemanticModelTaskOptions): Promise<SemanticMaskSuggestion> {
    void _image;
    void _category;
    options.onProgress?.(1);
    return Promise.resolve({
      positivePoints: [{ x: 0.5, y: 0.25 }],
      boundingBoxes: [{ x: 0.1, y: 0.05, width: 0.8, height: 0.4 }],
      confidence: 0.91
    });
  }
}

describe('Semantic masking application services', () => {
  it('turns a local model suggestion into editable, versioned mask recipe data', async () => {
    const project = PhotoProjectMother.create();
    const model = new ControllableSemanticModel();
    const mask = await new CreateSemanticMask(model).create(
      project,
      new CreateSemanticMaskMessage(
        project.getId().valueOf(),
        crypto.randomUUID(),
        'sky',
        new Blob(['preview'], { type: 'image/webp' })
      ),
      { signal: new AbortController().signal }
    );

    expect(mask.toPrimitives().shape).toEqual(expect.objectContaining({
      kind: 'ai-segmentation',
      semanticCategory: 'sky',
      strategy: 'local/model',
      version: 'pinned',
      confidence: 0.91,
      positivePoints: [{ x: 0.5, y: 0.25 }]
    }));
    expect(project.getMasks()).toHaveLength(0);
  });

  it('rejects requests for a different aggregate before invoking the model', async () => {
    const project = PhotoProjectMother.create();
    const model = new ControllableSemanticModel();
    await expect(new CreateSemanticMask(model).create(
      project,
      new CreateSemanticMaskMessage(
        crypto.randomUUID(),
        crypto.randomUUID(),
        'people',
        new Blob(['preview'], { type: 'image/jpeg' })
      ),
      { signal: new AbortController().signal }
    )).rejects.toThrow(/different project/);
  });

  it('manages the optional model lifecycle through one application boundary', async () => {
    const model = new ControllableSemanticModel();
    const manager = new ManageSemanticSegmentationModel(model);
    const progress: number[] = [];

    expect(manager.describe().supportedCategories).toEqual(['sky']);
    await manager.install({ signal: new AbortController().signal, onProgress: (value) => progress.push(value) });
    expect(await manager.inspect()).toBe('installed');
    expect(progress).toEqual([1]);
    await manager.remove();
    expect(model.removed).toBe(true);
  });
});
