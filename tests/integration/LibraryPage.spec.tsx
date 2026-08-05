import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createApplication } from '@/app/Application';
import { ListProjectsMessage } from '@/contexts/projects/application/list-projects/messages/ListProjectsMessage';
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
    await user.click(screen.getByRole('button', { name: 'Choose image' }));
    const dialog = await screen.findByRole('dialog', { name: 'Import photographs' });
    expect(within(dialog).getByText(/JPEG, PNG, or Sony ARW/)).toBeInTheDocument();
    const input = screen.getByLabelText('Select one or more JPEG, PNG, or Sony ARW images');
    await user.upload(input, new File(['png'], 'test.png', { type: 'image/png' }));
    expect(await screen.findByText('Editor open')).toBeInTheDocument();
  });

  it('applies installed local semantic suggestions as searchable project tags', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      value: vi.fn(() => Promise.resolve({ width: 2, height: 1, close: vi.fn() })),
      configurable: true
    });
    const application = createApplication(`rawcket-tagged-import-${crypto.randomUUID()}`);
    vi.spyOn(application.manageSemanticSegmentationModel, 'inspect').mockResolvedValue('installed');
    const suggestTags = vi.spyOn(application.suggestPhotoTags, 'suggest').mockResolvedValue(['sky', 'people']);
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

    await user.click(await screen.findByRole('button', { name: 'Choose image' }));
    const dialog = await screen.findByRole('dialog', { name: 'Import photographs' });
    expect(within(dialog).getByRole('checkbox', { name: 'Add tags automatically on import' })).toBeChecked();
    await user.upload(
      screen.getByLabelText('Select one or more JPEG, PNG, or Sony ARW images'),
      new File(['png'], 'tagged.png', { type: 'image/png' })
    );

    expect(await screen.findByText('Editor open')).toBeInTheDocument();
    expect(suggestTags).toHaveBeenCalledTimes(1);
    await waitFor(async () => {
      const matching = await application.listProjects.list(new ListProjectsMessage('sky', 0));
      expect(matching).toHaveLength(1);
    });
  });
});
