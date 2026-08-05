import { useCallback, useEffect, useRef, useState } from 'react';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';

export type SaveStatus = 'saved' | 'saving' | 'error';

export function useProjectAutosave(
  project: PhotoProject | null,
  revision: number,
  save: (project: PhotoProject) => Promise<void>,
  delay = 450
): { status: SaveStatus; error: string | null; flush: () => Promise<void> } {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [error, setError] = useState<string | null>(null);
  const currentProject = useRef(project);
  const timeout = useRef<number | null>(null);
  currentProject.current = project;

  const flush = useCallback(async (): Promise<void> => {
    if (timeout.current !== null) window.clearTimeout(timeout.current);
    const activeProject = currentProject.current;
    if (activeProject === null) return;
    setStatus('saving');
    try {
      await save(activeProject);
      setStatus('saved');
      setError(null);
    } catch (caught: unknown) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el proyecto.');
    }
  }, [save]);

  useEffect(() => {
    if (project === null || revision === 0) return;
    setStatus('saving');
    timeout.current = window.setTimeout(() => void flush(), delay);
    return () => {
      if (timeout.current !== null) window.clearTimeout(timeout.current);
    };
  }, [delay, flush, project, revision]);

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = (): void => { void flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flush]);

  return { status, error, flush };
}
