import type {
  SemanticModelDescriptor,
  SemanticModelStatus,
  SemanticModelTaskOptions,
  SemanticSegmentationModel
} from '../ports/SemanticSegmentationModel';

export class ManageSemanticSegmentationModel {
  private installation: Promise<void> | null = null;
  private installationController: AbortController | null = null;
  private installationProgress = 0;
  private readonly progressObservers = new Set<(completed: number) => void>();

  public constructor(private readonly model: SemanticSegmentationModel) {}

  public describe(): SemanticModelDescriptor { return this.model.describe(); }
  public inspect(): Promise<SemanticModelStatus> { return this.model.inspect(); }
  public install(options: SemanticModelTaskOptions): Promise<void> {
    if (options.signal.aborted) return Promise.reject(new DOMException('The local model download was cancelled.', 'AbortError'));
    if (options.onProgress !== undefined) {
      this.progressObservers.add(options.onProgress);
      options.onProgress(this.installationProgress);
    }
    if (this.installation === null) this.startInstallation();
    const installation = this.installation;
    if (installation === null) return Promise.reject(new Error('The local model download could not be started.'));
    return new Promise<void>((resolve, reject) => {
      let waiting = true;
      const stopObserving = (): void => {
        if (options.onProgress !== undefined) this.progressObservers.delete(options.onProgress);
      };
      const abort = (): void => {
        waiting = false;
        stopObserving();
        reject(new DOMException('The local model download was cancelled.', 'AbortError'));
      };
      options.signal.addEventListener('abort', abort, { once: true });
      void installation.then(
        () => { if (waiting) resolve(); },
        (error: unknown) => { if (waiting) reject(error instanceof Error ? error : new Error('The local model download failed.')); }
      ).finally(() => {
        options.signal.removeEventListener('abort', abort);
        stopObserving();
      });
    });
  }

  public async remove(): Promise<void> {
    this.installationController?.abort();
    await this.installation?.catch(() => undefined);
    await this.model.remove();
  }

  private startInstallation(): void {
    const controller = new AbortController();
    this.installationController = controller;
    this.installationProgress = 0;
    const installation = this.model.install({
      signal: controller.signal,
      onProgress: (completed) => {
        this.installationProgress = completed;
        for (const observer of this.progressObservers) observer(completed);
      }
    }).finally(() => {
      if (this.installation !== installation) return;
      this.installation = null;
      this.installationController = null;
      this.installationProgress = 0;
      this.progressObservers.clear();
    });
    this.installation = installation;
  }
}
