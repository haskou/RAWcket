import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createApplication } from './app/Application';
import { App } from './presentation/App';
import { ApplicationProvider } from './presentation/ApplicationContext';
import './presentation/styles.css';

const root = document.getElementById('root');
if (root === null) throw new Error('The RAWcket root container was not found.');

createRoot(root).render(
  <StrictMode>
    <ApplicationProvider application={createApplication()}>
      <App />
    </ApplicationProvider>
  </StrictMode>
);
