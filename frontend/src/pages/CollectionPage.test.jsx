import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CollectionPage from './CollectionPage';

vi.mock('../services/api', () => ({
  collectFingerprint: vi.fn(),
}));

vi.mock('../services/fingerprint', () => ({
  collectSignals: vi.fn(),
  FingerprintBlockedError: class FingerprintBlockedError extends Error {
    constructor() {
      super('blocked');
      this.name = 'FingerprintBlockedError';
    }
  },
}));

import { collectFingerprint } from '../services/api';
import { collectSignals, FingerprintBlockedError } from '../services/fingerprint';

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

  it('renders Same Machine heading when strongMatches is non-empty', async () => {
    const user = userEvent.setup();
    collectSignals.mockResolvedValue({ platform: 'MacIntel' });
    collectFingerprint.mockResolvedValue({
      userId: 'u1',
      deviceId: 'd1',
      deviceLabel: 'Firefox',
      matchResult: 'NEW_DEVICE',
      score: 0,
      changedSignals: [],
      machineMatch: {
        strongMatches: [
          {
            userId: 'u2',
            userName: 'userA',
            deviceId: 'd2',
            deviceLabel: 'Chrome on MacOS',
            lastSeenAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          },
        ],
        possibleMatches: [],
      },
    });

    render(<CollectionPage />);
    await user.type(screen.getByLabelText('Enter your name'), 'testuser');
    await user.click(screen.getByRole('button', { name: 'Identify' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Same machine', exact: true }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Chrome on MacOS')).toBeInTheDocument();
    expect(screen.getByText('SAME_MACHINE')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Matching hardware', exact: true }),
    ).not.toBeInTheDocument();
  });

  it('renders Matching Hardware heading when only possibleMatches is non-empty', async () => {
    const user = userEvent.setup();
    collectSignals.mockResolvedValue({ platform: 'MacIntel' });
    collectFingerprint.mockResolvedValue({
      userId: 'u1',
      deviceId: 'd1',
      deviceLabel: 'Firefox',
      matchResult: 'NEW_DEVICE',
      score: 0,
      changedSignals: [],
      machineMatch: {
        strongMatches: [],
        possibleMatches: [
          {
            userId: 'u2',
            userName: 'userB',
            deviceId: 'd2',
            deviceLabel: 'Chrome on MacOS',
            lastSeenAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          },
        ],
      },
    });

    render(<CollectionPage />);
    await user.type(screen.getByLabelText('Enter your name'), 'testuser');
    await user.click(screen.getByRole('button', { name: 'Identify' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Matching hardware', exact: true }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { name: 'Same machine', exact: true }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Chrome on MacOS')).toBeInTheDocument();
    expect(screen.getByText('MATCHING_HARDWARE')).toBeInTheDocument();
  });

  it('does not render Same Machine panel when both lists are empty', async () => {
    const user = userEvent.setup();
    collectSignals.mockResolvedValue({ platform: 'MacIntel' });
    collectFingerprint.mockResolvedValue({
      userId: 'u1',
      deviceId: 'd1',
      deviceLabel: 'Firefox',
      matchResult: 'NEW_DEVICE',
      score: 0,
      changedSignals: [],
      machineMatch: { strongMatches: [], possibleMatches: [] },
    });

    render(<CollectionPage />);
    await user.type(screen.getByLabelText('Enter your name'), 'testuser');
    await user.click(screen.getByRole('button', { name: 'Identify' }));

    await waitFor(() => {
      expect(screen.getByText('NEW_DEVICE')).toBeInTheDocument();
    });
    expect(screen.getByText('NO_MACHINE_MATCH')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Same machine', exact: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Matching hardware', exact: true }),
    ).not.toBeInTheDocument();
  });

  it('does not render Same Machine panel when machineMatch is missing', async () => {
    const user = userEvent.setup();
    collectSignals.mockResolvedValue({ platform: 'MacIntel' });
    collectFingerprint.mockResolvedValue({
      userId: 'u1',
      deviceId: 'd1',
      deviceLabel: 'Firefox',
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
    expect(screen.getByText('NO_MACHINE_MATCH')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Same machine', exact: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Matching hardware', exact: true }),
    ).not.toBeInTheDocument();
  });

  it('submits the form when Enter is pressed in the name field', async () => {
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

    const input = screen.getByLabelText('Enter your name');
    await user.type(input, 'enterkey{Enter}');

    await waitFor(() => {
      expect(collectFingerprint).toHaveBeenCalled();
    });
    expect(collectFingerprint).toHaveBeenCalledWith(expect.objectContaining({ name: 'enterkey' }));
  });

  it('shows specific message when FingerprintJS is blocked by privacy extension', async () => {
    const user = userEvent.setup();
    collectSignals.mockRejectedValue(new FingerprintBlockedError());

    render(<CollectionPage />);

    await user.type(screen.getByLabelText('Enter your name'), 'userD');
    await user.click(screen.getByRole('button', { name: 'Identify' }));

    await waitFor(() => {
      expect(screen.getByText(/privacy extension/i)).toBeInTheDocument();
    });
  });
});
