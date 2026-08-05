import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createApplication } from '@/app/Application';
import { ApplicationProvider } from '@/presentation/ApplicationContext';
import { LibraryPage } from '@/presentation/pages/LibraryPage';

describe('LibraryPage', () => {
  it('muestra el empty state e importa una imagen local hacia el editor', async () => {
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
            <Route path="/editor/:projectId" element={<p>Editor abierto</p>} />
          </Routes>
        </MemoryRouter>
      </ApplicationProvider>
    );

    expect(await screen.findByText('Empieza por una imagen')).toBeInTheDocument();
    const input = screen.getByLabelText('Seleccionar imagen JPEG o PNG');
    await user.upload(input, new File(['png'], 'prueba.png', { type: 'image/png' }));
    expect(await screen.findByText('Editor abierto')).toBeInTheDocument();
  });
});
