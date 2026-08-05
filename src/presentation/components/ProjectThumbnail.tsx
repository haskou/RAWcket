import { useEffect, useState, type ReactElement } from 'react';
import { ProjectId } from '@/contexts/projects/domain/value-objects/ProjectId';
import { InspectSourceImageMessage } from '@/contexts/projects/application/inspect-source-image/messages/InspectSourceImageMessage';
import { useApplication } from '../ApplicationContext';
import { useObjectUrl } from '../hooks/useObjectUrl';

export function ProjectThumbnail({ projectId, name, mimeType }: { projectId: string; name: string; mimeType: string }): ReactElement {
  const { sourceFiles, inspectSourceImage } = useApplication();
  const [source, setSource] = useState<Blob | null>(null);
  const url = useObjectUrl(source);
  useEffect(() => {
    void sourceFiles.find(new ProjectId(projectId)).then(async (file) => {
      if (file === null || mimeType !== 'image/x-sony-arw') { setSource(file); return; }
      const inspection = await inspectSourceImage.inspect(new InspectSourceImageMessage(file, 'source.arw'));
      setSource(inspection.embeddedPreview);
    });
  }, [inspectSourceImage, mimeType, projectId, sourceFiles]);
  return (
    <div className="thumbnail">
      {url === null ? <div className="thumbnail-placeholder" aria-label="Loading thumbnail">R</div> : <img src={url} alt={`Original of ${name}`} />}
      <span className="original-badge">ORIGINAL</span>
    </div>
  );
}
