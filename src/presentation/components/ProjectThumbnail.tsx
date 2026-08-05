import { useEffect, useState, type ReactElement } from 'react';
import { ProjectId } from '@/contexts/projects/domain/value-objects/ProjectId';
import { useApplication } from '../ApplicationContext';
import { useObjectUrl } from '../hooks/useObjectUrl';

export function ProjectThumbnail({ projectId, name }: { projectId: string; name: string }): ReactElement {
  const { sourceFiles } = useApplication();
  const [source, setSource] = useState<Blob | null>(null);
  const url = useObjectUrl(source);
  useEffect(() => {
    void sourceFiles.find(new ProjectId(projectId)).then(setSource);
  }, [projectId, sourceFiles]);
  return (
    <div className="thumbnail">
      {url === null ? <div className="thumbnail-placeholder" aria-label="Cargando miniatura">R</div> : <img src={url} alt={`Original de ${name}`} />}
      <span className="original-badge">ORIGINAL</span>
    </div>
  );
}
