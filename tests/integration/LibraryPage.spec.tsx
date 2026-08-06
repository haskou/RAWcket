import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createApplication } from '@/app/Application';
import { ListProjectsMessage } from '@/contexts/projects/application/list-projects/messages/ListProjectsMessage';
import { CaptureMetadata } from '@/contexts/projects/domain/CaptureMetadata';
import { FindProjectMessage } from '@/contexts/projects/application/find-project/messages/FindProjectMessage';
import { ApplicationProvider } from '@/presentation/ApplicationContext';
import { LibraryPage } from '@/presentation/pages/LibraryPage';

describe('LibraryPage', () => {
  it('downloads the local model automatically, exposes progress, and blocks import until ready', async () => {
    const application = createApplication(`rawcket-auto-model-${crypto.randomUUID()}`);
    vi.spyOn(application.manageSemanticSegmentationModel, 'inspect').mockResolvedValue('not-installed');
    let finishInstallation: (() => void) | undefined;
    vi.spyOn(application.manageSemanticSegmentationModel, 'install').mockImplementation((options) => {
      options.onProgress?.(0.42);
      return new Promise<void>((resolve) => { finishInstallation = resolve; });
    });
    render(
      <ApplicationProvider application={application}>
        <MemoryRouter><LibraryPage /></MemoryRouter>
      </ApplicationProvider>
    );

    expect(await screen.findByText('Local AI · 42%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Local AI 42%' })).toBeDisabled();
    finishInstallation?.();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled());
  });

  it('holds a selected photograph and imports it without automatic tags when local model preparation fails', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      value: vi.fn(() => Promise.resolve({ width: 2, height: 1, close: vi.fn() })),
      configurable: true
    });
    const application = createApplication(`rawcket-model-failure-${crypto.randomUUID()}`);
    vi.spyOn(application.manageSemanticSegmentationModel, 'inspect').mockResolvedValue('not-installed');
    let failInstallation: ((reason: Error) => void) | undefined;
    vi.spyOn(application.manageSemanticSegmentationModel, 'install').mockImplementation((options) => {
      options.onProgress?.(0.42);
      return new Promise<void>((_resolve, reject) => { failInstallation = reject; });
    });
    const suggestTags = vi.spyOn(application.suggestPhotoTags, 'suggest');
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

    expect(await screen.findByText('Local AI · 42%')).toBeInTheDocument();
    await user.upload(
      screen.getByLabelText('Select one or more JPEG, PNG, or Sony ARW images'),
      new File(['png'], 'held.png', { type: 'image/png' })
    );
    expect(await screen.findByText(/Your selection is held/)).toBeInTheDocument();
    failInstallation?.(new Error('Model download unavailable'));

    expect(await screen.findByText('Editor open')).toBeInTheDocument();
    expect(suggestTags).not.toHaveBeenCalled();
  });

  it('tags the first selected photograph after automatic model preparation finishes', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      value: vi.fn(() => Promise.resolve({ width: 2, height: 1, close: vi.fn() })),
      configurable: true
    });
    const application = createApplication(`rawcket-first-tagged-import-${crypto.randomUUID()}`);
    vi.spyOn(application.manageSemanticSegmentationModel, 'inspect')
      .mockResolvedValueOnce('not-installed')
      .mockResolvedValue('installed');
    let finishInstallation: (() => void) | undefined;
    vi.spyOn(application.manageSemanticSegmentationModel, 'install').mockImplementation((options) => {
      options.onProgress?.(0.42);
      return new Promise<void>((resolve) => { finishInstallation = resolve; });
    });
    const suggestTags = vi.spyOn(application.suggestPhotoTags, 'suggest').mockResolvedValue(['vehicles', 'road']);
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

    expect(await screen.findByText('Local AI · 42%')).toBeInTheDocument();
    await user.upload(
      screen.getByLabelText('Select one or more JPEG, PNG, or Sony ARW images'),
      new File(['png'], 'first.png', { type: 'image/png' })
    );
    finishInstallation?.();

    expect(await screen.findByText('Editor open')).toBeInTheDocument();
    expect(suggestTags).toHaveBeenCalledTimes(1);
    await waitFor(async () => {
      expect(await application.listProjects.list(new ListProjectsMessage('vehicles', 0))).toHaveLength(1);
    });
  });

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

    expect(await screen.findByText('Import your first photograph')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Choose photographs' }));
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

    await user.click(await screen.findByRole('button', { name: 'Choose photographs' }));
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

  it('imports a same-name RAW and JPEG as one calibrated RAW project', async () => {
    const application = createApplication(`rawcket-paired-import-${crypto.randomUUID()}`);
    vi.spyOn(application.manageSemanticSegmentationModel, 'inspect').mockResolvedValue('installed');
    vi.spyOn(application.suggestPhotoTags, 'suggest').mockResolvedValue([]);
    vi.spyOn(application.inspectSourceImage, 'inspect').mockResolvedValue({
      width: 6_000,
      height: 4_000,
      mimeType: 'image/x-sony-arw',
      embeddedPreview: null,
      captureMetadata: CaptureMetadata.empty().toPrimitives()
    });
    const calibratedProfile = {
      redGain: 1.03, greenGain: 1, blueGain: 0.96,
      sourceMedian: 0.48, targetMedian: 0.5,
      shadowContrast: 1.02, highlightContrast: 1.08, chroma: 1.28
    };
    const calibrate = vi.spyOn(application.calibrateRawDisplay, 'calibrate').mockResolvedValue(calibratedProfile);
    const review = vi.spyOn(application.reviewImportCandidates, 'review');
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

    await user.upload(
      await screen.findByLabelText('Select one or more JPEG, PNG, or Sony ARW images'),
      [
        new File(['raw'], 'DSC08545.ARW', { type: 'image/x-sony-arw' }),
        new File(['jpeg'], 'DSC08545.JPG', { type: 'image/jpeg' })
      ]
    );

    expect(await screen.findByText('Editor open')).toBeInTheDocument();
    expect(calibrate).toHaveBeenCalledTimes(1);
    expect(review).not.toHaveBeenCalled();
    const projects = await application.listProjects.list(new ListProjectsMessage('', 0));
    expect(projects).toHaveLength(1);
    const project = await application.findProject.find(new FindProjectMessage(projects[0]?.getId().valueOf() ?? ''));
    expect(project?.getSource().getDisplayProfile().toPrimitives()).toEqual(calibratedProfile);
  });
});
