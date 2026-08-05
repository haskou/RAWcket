import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createApplication } from '@/app/Application';
import { ApplicationProvider } from '@/presentation/ApplicationContext';
import { LibraryPage } from '@/presentation/pages/LibraryPage';

describe('LibraryPage', () => {
  it('shows the empty state and imports a local image into the editor', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      value: vi.fn(() => Promise.resolve({ width: 2, height: 1, close: vi.fn() })),
      configurable: true
    });
    const application = createApplication(`rawcket-library-${crypto.randomUUID()}`);
    const user = userEvent.setup();
    render(
      <ApplicationProvider application={application}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/editor/:projectId" element={<p>Editor open</p>} />
          </Routes>
        </MemoryRouter>
      </ApplicationProvider>
    );

    expect(await screen.findByText('Start with a photograph')).toBeInTheDocument();
    const input = screen.getByLabelText('Select a JPEG or PNG image');
    await user.upload(input, new File(['png'], 'test.png', { type: 'image/png' }));
    expect(await screen.findByText('Editor open')).toBeInTheDocument();
  });
});
