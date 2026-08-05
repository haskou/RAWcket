import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { createApplication } from './app/Application';
import { App } from './presentation/App';
import { ApplicationProvider } from './presentation/ApplicationContext';
import './presentation/styles.css';

registerSW({ immediate: true });

const root = document.getElementById('root');
if (root === null) throw new Error('The RAWcket root container was not found.');

createRoot(root).render(
  <StrictMode>
    <ApplicationProvider application={createApplication()}>
      <App />
    </ApplicationProvider>
  </StrictMode>
);
