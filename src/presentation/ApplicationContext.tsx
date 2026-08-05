import { createContext, useContext, type PropsWithChildren, type ReactElement } from 'react';
import type { Application } from '@/app/Application';

const ApplicationContext = createContext<Application | null>(null);

export function ApplicationProvider({ application, children }: PropsWithChildren<{ application: Application }>): ReactElement {
  return <ApplicationContext.Provider value={application}>{children}</ApplicationContext.Provider>;
}

export function useApplication(): Application {
  const application = useContext(ApplicationContext);
  if (application === null) throw new Error('RAWcket no ha inicializado sus servicios.');
  return application;
}
