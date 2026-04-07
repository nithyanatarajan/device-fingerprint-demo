import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserDevicesList from './UserDevicesList';

vi.mock('../services/api', () => ({
  getUsers: vi.fn(),
  getUserDevices: vi.fn(),
}));

import { getUsers, getUserDevices } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UserDevicesList', () => {
  it('renders loading then user list', async () => {
    getUsers.mockResolvedValue([
      { id: 'u1', name: 'alice', deviceCount: 2 },
      { id: 'u2', name: 'bob', deviceCount: 1 },
    ]);
    getUserDevices.mockResolvedValue([]);

    render(<UserDevicesList />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('2 device(s)')).toBeInTheDocument();
    expect(screen.getByText('1 device(s)')).toBeInTheDocument();
  });

  it('eagerly loads devices for every user without requiring a click', async () => {
    getUsers.mockResolvedValue([{ id: 'u1', name: 'alice', deviceCount: 1 }]);
    getUserDevices.mockResolvedValue([
      {
        id: 'd1',
        label: 'Chrome on Mac',
        machineSignature: 'abcd1234abcd1234',
        publicIp: '1.2.3.4',
        lastSeenAt: '2024-01-01T00:00:00Z',
        visitCount: 5,
      },
    ]);

    render(<UserDevicesList />);

    // Devices visible WITHOUT any click — auto-expand on load.
    await waitFor(() => {
      expect(screen.getByText('Chrome on Mac')).toBeInTheDocument();
    });
    expect(getUserDevices).toHaveBeenCalledWith('u1');
    expect(screen.getByText(/abcd1234abcd1234/)).toBeInTheDocument();
    expect(screen.getByText(/1\.2\.3\.4/)).toBeInTheDocument();
    expect(screen.getByText(/visits: 5/)).toBeInTheDocument();
  });

  it('shows null sig and ip when missing', async () => {
    getUsers.mockResolvedValue([{ id: 'u1', name: 'alice', deviceCount: 1 }]);
    getUserDevices.mockResolvedValue([
      {
        id: 'd1',
        label: 'Chrome',
        machineSignature: null,
        publicIp: null,
        lastSeenAt: null,
        visitCount: 0,
      },
    ]);

    render(<UserDevicesList />);
    await waitFor(() => {
      expect(screen.getByText(/sig: null/)).toBeInTheDocument();
    });
    expect(screen.getByText(/ip: null/)).toBeInTheDocument();
  });

  it('collapses on click after auto-expand', async () => {
    const user = userEvent.setup();
    getUsers.mockResolvedValue([{ id: 'u1', name: 'alice', deviceCount: 1 }]);
    getUserDevices.mockResolvedValue([
      { id: 'd1', label: 'Chrome', visitCount: 1, machineSignature: 'x', publicIp: 'y' },
    ]);

    render(<UserDevicesList />);
    await waitFor(() => expect(screen.getByText('Chrome')).toBeInTheDocument());

    await user.click(screen.getByText('alice'));
    // Collapse hides via animation; with unmountOnExit it eventually unmounts
    await waitFor(() => {
      expect(screen.queryByText('Chrome')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no users', async () => {
    getUsers.mockResolvedValue([]);
    render(<UserDevicesList />);
    await waitFor(() => {
      expect(screen.getByText(/No users yet/)).toBeInTheDocument();
    });
  });

  it('shows error when fetch fails', async () => {
    getUsers.mockRejectedValue(new Error('users boom'));
    render(<UserDevicesList />);
    await waitFor(() => {
      expect(screen.getByText('users boom')).toBeInTheDocument();
    });
  });

  it('highlights rows by transition based on previewByDeviceId', async () => {
    getUsers.mockResolvedValue([{ id: 'u1', name: 'alice', deviceCount: 2 }]);
    getUserDevices.mockResolvedValue([
      { id: 'd1', label: 'Chrome', visitCount: 1, machineSignature: 'a', publicIp: 'b' },
      { id: 'd2', label: 'Firefox', visitCount: 2, machineSignature: 'c', publicIp: 'd' },
    ]);
    const previewByDeviceId = {
      d1: {
        deviceId: 'd1',
        currentClassification: 'NEW_DEVICE',
        proposedClassification: 'SAME_DEVICE',
        transition: 'PROMOTED',
      },
      d2: {
        deviceId: 'd2',
        currentClassification: 'SAME_DEVICE',
        proposedClassification: 'DRIFT_DETECTED',
        transition: 'DEMOTED',
      },
    };

    render(<UserDevicesList previewByDeviceId={previewByDeviceId} />);
    await waitFor(() => expect(screen.getByText('Chrome')).toBeInTheDocument());

    expect(screen.getByTestId('device-row-d1')).toHaveAttribute('data-transition', 'PROMOTED');
    expect(screen.getByTestId('device-row-d2')).toHaveAttribute('data-transition', 'DEMOTED');
    expect(screen.getAllByText('NEW_DEVICE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SAME_DEVICE').length).toBeGreaterThan(0);
    expect(screen.getByText('DRIFT_DETECTED')).toBeInTheDocument();
  });

  it('does not highlight UNCHANGED rows', async () => {
    getUsers.mockResolvedValue([{ id: 'u1', name: 'alice', deviceCount: 1 }]);
    getUserDevices.mockResolvedValue([
      { id: 'd1', label: 'Chrome', visitCount: 1, machineSignature: 'a', publicIp: 'b' },
    ]);
    const previewByDeviceId = {
      d1: {
        deviceId: 'd1',
        currentClassification: 'SAME_DEVICE',
        proposedClassification: 'SAME_DEVICE',
        transition: 'UNCHANGED',
      },
    };

    render(<UserDevicesList previewByDeviceId={previewByDeviceId} />);
    await waitFor(() => expect(screen.getByText('Chrome')).toBeInTheDocument());
    expect(screen.getByTestId('device-row-d1')).toHaveAttribute('data-transition', 'UNCHANGED');
  });

  it('renders score placeholder when no preview data is available', async () => {
    getUsers.mockResolvedValue([{ id: 'u1', name: 'alice', deviceCount: 1 }]);
    getUserDevices.mockResolvedValue([
      { id: 'd1', label: 'Chrome', visitCount: 1, machineSignature: 'a', publicIp: 'b' },
    ]);

    render(<UserDevicesList />);
    await waitFor(() => expect(screen.getByText('Chrome')).toBeInTheDocument());
    expect(screen.getByTestId('device-score')).toHaveTextContent('score: —');
  });

  it('renders the static score when preview data has no delta', async () => {
    getUsers.mockResolvedValue([{ id: 'u1', name: 'alice', deviceCount: 1 }]);
    getUserDevices.mockResolvedValue([
      { id: 'd1', label: 'Chrome', visitCount: 1, machineSignature: 'a', publicIp: 'b' },
    ]);
    const previewByDeviceId = {
      d1: {
        deviceId: 'd1',
        currentClassification: 'SAME_DEVICE',
        proposedClassification: 'SAME_DEVICE',
        currentScore: 87.5,
        proposedScore: 87.5,
        transition: 'UNCHANGED',
      },
    };

    render(<UserDevicesList previewByDeviceId={previewByDeviceId} />);
    await waitFor(() => expect(screen.getByText('Chrome')).toBeInTheDocument());
    expect(screen.getByTestId('device-score')).toHaveTextContent('score: 87.5');
  });

  it('renders the before → after score with delta when preview shifts the score', async () => {
    getUsers.mockResolvedValue([{ id: 'u1', name: 'alice', deviceCount: 1 }]);
    getUserDevices.mockResolvedValue([
      { id: 'd1', label: 'Chrome', visitCount: 1, machineSignature: 'a', publicIp: 'b' },
    ]);
    const previewByDeviceId = {
      d1: {
        deviceId: 'd1',
        currentClassification: 'SAME_DEVICE',
        proposedClassification: 'DRIFT_DETECTED',
        currentScore: 90.2,
        proposedScore: 42.1,
        transition: 'DEMOTED',
      },
    };

    render(<UserDevicesList previewByDeviceId={previewByDeviceId} />);
    await waitFor(() => expect(screen.getByText('Chrome')).toBeInTheDocument());
    const score = screen.getByTestId('device-score');
    expect(score).toHaveTextContent('90.2');
    expect(score).toHaveTextContent('42.1');
    expect(score).toHaveTextContent('-48.1');
  });

  it('shows per-user device-fetch error', async () => {
    getUsers.mockResolvedValue([{ id: 'u1', name: 'alice', deviceCount: 1 }]);
    getUserDevices.mockRejectedValue(new Error('device boom'));

    render(<UserDevicesList />);
    await waitFor(() => {
      expect(screen.getByText('device boom')).toBeInTheDocument();
    });
  });
});
