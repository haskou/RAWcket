import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PwaInstallButton } from '@/presentation/components/PwaInstallButton';

describe('PwaInstallButton', () => {
  it('offers browser installation only after the installability event and requires a click', async () => {
    const user = userEvent.setup();
    const prompt = vi.fn(() => Promise.resolve());
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: prompt },
      userChoice: { value: Promise.resolve({ outcome: 'accepted', platform: 'web' }) }
    });
    render(<PwaInstallButton />);

    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
    fireEvent(window, event);
    expect(event.defaultPrevented).toBe(true);

    await user.click(await screen.findByRole('button', { name: 'Install app' }));
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  });
});
