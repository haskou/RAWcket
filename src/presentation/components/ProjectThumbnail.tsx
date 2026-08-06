import { useEffect, useState, type ReactElement } from 'react';
import { RenderProjectThumbnailMessage } from '@/contexts/projects/application/render-project-thumbnail/messages/RenderProjectThumbnailMessage';
import { useApplication } from '../ApplicationContext';
import { useObjectUrl } from '../hooks/useObjectUrl';

export function ProjectThumbnail({ projectId, name }: { projectId: string; name: string }): ReactElement {
  const { renderProjectThumbnail } = useApplication();
  const [source, setSource] = useState<Blob | null>(null);
  const url = useObjectUrl(source);
  useEffect(() => {
    let active = true;
    void renderProjectThumbnail.render(new RenderProjectThumbnailMessage(projectId)).then((thumbnail) => {
      if (active) setSource(thumbnail);
    }).catch(() => {
      if (active) setSource(null);
    });
    return () => { active = false; };
  }, [projectId, renderProjectThumbnail]);
  return (
    <div className="thumbnail">
      {url === null ? <div className="thumbnail-placeholder" aria-label="Loading thumbnail">R</div> : <img src={url} alt={`Original of ${name}`} />}
      <span className="original-badge">ORIGINAL</span>
    </div>
  );
}
