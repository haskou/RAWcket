import type { SourceImageInspection, SourceImageInspector } from '../ports/SourceImageInspector';
import type { InspectSourceImageMessage } from './messages/InspectSourceImageMessage';

export class InspectSourceImage {
  public constructor(private readonly inspector: SourceImageInspector) {}

  public inspect(message: InspectSourceImageMessage): Promise<SourceImageInspection> {
    return this.inspector.inspect(message);
  }
}
