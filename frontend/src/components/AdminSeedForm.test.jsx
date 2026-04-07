import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminSeedForm from './AdminSeedForm';

vi.mock('../services/api', () => ({
  seedDemoUser: vi.fn(),
  getSeedSummary: vi.fn(),
  clearSeedData: vi.fn(),
}));

import { seedDemoUser, getSeedSummary, clearSeedData } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminSeedForm', () => {
  it('renders the suffix-only input with the prefix as a fixed adornment', () => {
    render(<AdminSeedForm />);
    // The input contains only the suffix; the prefix is a non-editable adornment.
    expect(screen.getByLabelText('User name')).toHaveValue('alpha');
    expect(screen.getByText('demo-user-')).toBeInTheDocument();
    expect(screen.getByText('Will be created as demo-user-alpha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seed' })).toBeEnabled();
  });

  it('disables Seed button when suffix is empty', async () => {
    const user = userEvent.setup();
    render(<AdminSeedForm />);
    const input = screen.getByLabelText('User name');
    await user.clear(input);
    expect(screen.getByRole('button', { name: 'Seed' })).toBeDisabled();
    expect(screen.getByText('Lowercase letters, digits, and hyphens only')).toBeInTheDocument();
  });

  it('disables Seed button when suffix has invalid characters', async () => {
    const user = userEvent.setup();
    render(<AdminSeedForm />);
    const input = screen.getByLabelText('User name');
    await user.clear(input);
    await user.type(input, 'bob smith!');
    expect(screen.getByRole('button', { name: 'Seed' })).toBeDisabled();
  });

  it('seeds and shows the result chips', async () => {
    const user = userEvent.setup();
    seedDemoUser.mockResolvedValue({
      userId: 'u1',
      deviceId: 'd1',
      deviceLabel: 'Chrome on Linux',
      matchResult: 'NEW_DEVICE',
      score: 0,
      machineMatch: { strongMatches: [], possibleMatches: [] },
    });

    const onChanged = vi.fn();
    render(<AdminSeedForm onChanged={onChanged} />);

    await user.click(screen.getByRole('button', { name: 'Seed' }));

    await waitFor(() => {
      expect(screen.getByText('NEW_DEVICE')).toBeInTheDocument();
    });
    expect(seedDemoUser).toHaveBeenCalledWith({
      userName: 'demo-user-alpha',
      browser: 'chrome',
      vpn: false,
      incognito: false,
    });
    expect(screen.getByText('NO_MACHINE_MATCH')).toBeInTheDocument();
    expect(screen.getByText('Chrome on Linux')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('opens clear dialog with summary and confirms', async () => {
    const user = userEvent.setup();
    getSeedSummary.mockResolvedValue({ users: 3, devices: 5, fingerprints: 12 });
    clearSeedData.mockResolvedValue({ users: 3, devices: 5, fingerprints: 12 });

    const onChanged = vi.fn();
    render(<AdminSeedForm onChanged={onChanged} />);

    await user.click(screen.getByRole('button', { name: 'Clear all demo data' }));

    await waitFor(() => {
      expect(screen.getByText(/3 user\(s\)/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(clearSeedData).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText(/Cleared: 3 user/)).toBeInTheDocument();
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('cancel closes the dialog without calling clearSeedData', async () => {
    const user = userEvent.setup();
    getSeedSummary.mockResolvedValue({ users: 1, devices: 1, fingerprints: 1 });

    render(<AdminSeedForm />);
    await user.click(screen.getByRole('button', { name: 'Clear all demo data' }));
    await waitFor(() => {
      expect(screen.getByText(/1 user\(s\)/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByText(/1 user\(s\)/)).not.toBeInTheDocument();
    });
    expect(clearSeedData).not.toHaveBeenCalled();
  });

  it('shows error when getSeedSummary fails', async () => {
    const user = userEvent.setup();
    getSeedSummary.mockRejectedValue(new Error('summary boom'));
    render(<AdminSeedForm />);
    await user.click(screen.getByRole('button', { name: 'Clear all demo data' }));
    await waitFor(() => {
      expect(screen.getByText('summary boom')).toBeInTheDocument();
    });
  });

  it('shows error when clearSeedData fails', async () => {
    const user = userEvent.setup();
    getSeedSummary.mockResolvedValue({ users: 1, devices: 1, fingerprints: 1 });
    clearSeedData.mockRejectedValue(new Error('clear boom'));
    render(<AdminSeedForm />);
    await user.click(screen.getByRole('button', { name: 'Clear all demo data' }));
    await waitFor(() => {
      expect(screen.getByText(/1 user\(s\)/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => {
      expect(screen.getByText('clear boom')).toBeInTheDocument();
    });
  });

  it('shows error if seed fails', async () => {
    const user = userEvent.setup();
    seedDemoUser.mockRejectedValue(new Error('seed boom'));
    render(<AdminSeedForm />);
    await user.click(screen.getByRole('button', { name: 'Seed' }));
    await waitFor(() => {
      expect(screen.getByText('seed boom')).toBeInTheDocument();
    });
  });
});
