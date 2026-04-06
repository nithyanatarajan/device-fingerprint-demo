import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CollectionPage from './CollectionPage';

vi.mock('../services/api', () => ({
  collectFingerprint: vi.fn(),
}));

vi.mock('../services/fingerprint', () => ({
  collectSignals: vi.fn(),
}));

import { collectFingerprint } from '../services/api';
import { collectSignals } from '../services/fingerprint';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CollectionPage', () => {
  it('renders name input and submit button', () => {
    render(<CollectionPage />);

    expect(screen.getByLabelText('Enter your name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Identify' })).toBeInTheDocument();
  });

  it('submit button is disabled when name is empty', () => {
    render(<CollectionPage />);

    expect(screen.getByRole('button', { name: 'Identify' })).toBeDisabled();
  });

  it('shows result after submission for new device', async () => {
    const user = userEvent.setup();
    collectSignals.mockResolvedValue({ platform: 'MacIntel', timezone: 'UTC' });
    collectFingerprint.mockResolvedValue({
      userId: 'u1',
      deviceId: 'd1',
      deviceLabel: 'Chrome on Mac',
      matchResult: 'NEW_DEVICE',
      score: 0,
      changedSignals: [],
    });

    render(<CollectionPage />);

    await user.type(screen.getByLabelText('Enter your name'), 'testuser');
    await user.click(screen.getByRole('button', { name: 'Identify' }));

    await waitFor(() => {
      expect(screen.getByText('NEW_DEVICE')).toBeInTheDocument();
    });

    expect(screen.getByText(/New device registered for testuser/)).toBeInTheDocument();
  });

  it('shows result for same device match', async () => {
    const user = userEvent.setup();
    collectSignals.mockResolvedValue({ platform: 'MacIntel' });
    collectFingerprint.mockResolvedValue({
      userId: 'u1',
      deviceId: 'd1',
      deviceLabel: 'Chrome on Mac',
      matchResult: 'SAME_DEVICE',
      score: 95,
      changedSignals: [],
    });

    render(<CollectionPage />);

    await user.type(screen.getByLabelText('Enter your name'), 'userA');
    await user.click(screen.getByRole('button', { name: 'Identify' }));

    await waitFor(() => {
      expect(screen.getByText('SAME_DEVICE')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Welcome back userA, we recognized your Chrome on Mac/),
    ).toBeInTheDocument();
  });

  it('shows changed signals alert for drift', async () => {
    const user = userEvent.setup();
    collectSignals.mockResolvedValue({ platform: 'MacIntel', timezone: 'UTC' });
    collectFingerprint.mockResolvedValue({
      userId: 'u1',
      deviceId: 'd1',
      deviceLabel: 'Chrome on Mac',
      matchResult: 'DRIFT_DETECTED',
      score: 70,
      changedSignals: ['timezone'],
    });

    render(<CollectionPage />);

    await user.type(screen.getByLabelText('Enter your name'), 'userB');
    await user.click(screen.getByRole('button', { name: 'Identify' }));

    await waitFor(() => {
      expect(screen.getByText('DRIFT_DETECTED')).toBeInTheDocument();
    });

    expect(screen.getByText(/your Chrome on Mac looks a bit different/)).toBeInTheDocument();
    expect(screen.getByText(/Changed signals detected: timezone/)).toBeInTheDocument();
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    collectSignals.mockRejectedValue(new Error('Network error'));

    render(<CollectionPage />);

    await user.type(screen.getByLabelText('Enter your name'), 'userC');
    await user.click(screen.getByRole('button', { name: 'Identify' }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
