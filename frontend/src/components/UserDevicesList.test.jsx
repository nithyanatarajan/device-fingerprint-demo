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

    render(<UserDevicesList />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('2 device(s)')).toBeInTheDocument();
    expect(screen.getByText('1 device(s)')).toBeInTheDocument();
  });

  it('expands user on click and fetches devices', async () => {
    const user = userEvent.setup();
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

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    await user.click(screen.getByText('alice'));

    await waitFor(() => {
      expect(screen.getByText('Chrome on Mac')).toBeInTheDocument();
    });
    expect(getUserDevices).toHaveBeenCalledWith('u1');
    expect(screen.getByText(/abcd1234abcd1234/)).toBeInTheDocument();
    expect(screen.getByText(/1\.2\.3\.4/)).toBeInTheDocument();
    expect(screen.getByText(/visits: 5/)).toBeInTheDocument();
  });

  it('shows null sig and ip when missing', async () => {
    const user = userEvent.setup();
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
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    await user.click(screen.getByText('alice'));

    await waitFor(() => {
      expect(screen.getByText(/sig: null/)).toBeInTheDocument();
    });
    expect(screen.getByText(/ip: null/)).toBeInTheDocument();
  });

  it('toggles closed on second click', async () => {
    const user = userEvent.setup();
    getUsers.mockResolvedValue([{ id: 'u1', name: 'alice', deviceCount: 1 }]);
    getUserDevices.mockResolvedValue([
      { id: 'd1', label: 'Chrome', visitCount: 1, machineSignature: 'x', publicIp: 'y' },
    ]);

    render(<UserDevicesList />);
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());

    await user.click(screen.getByText('alice'));
    await waitFor(() => expect(screen.getByText('Chrome')).toBeInTheDocument());

    await user.click(screen.getByText('alice'));
    // Collapse hides via animation but since unmountOnExit, eventually unmounts
    await waitFor(() => {
      expect(screen.queryByText('Chrome')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no users', async () => {
    getUsers.mockResolvedValue([]);
    render(<UserDevicesList />);
    await waitFor(() => {
      expect(screen.getByText('No users yet.')).toBeInTheDocument();
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
    const user = userEvent.setup();
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
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    await user.click(screen.getByText('alice'));

    await waitFor(() => {
      expect(screen.getByText('Chrome')).toBeInTheDocument();
    });
    expect(screen.getByTestId('device-row-d1')).toHaveAttribute('data-transition', 'PROMOTED');
    expect(screen.getByTestId('device-row-d2')).toHaveAttribute('data-transition', 'DEMOTED');
    // chips for old → new visible
    expect(screen.getAllByText('NEW_DEVICE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SAME_DEVICE').length).toBeGreaterThan(0);
    expect(screen.getByText('DRIFT_DETECTED')).toBeInTheDocument();
  });

  it('does not highlight UNCHANGED rows', async () => {
    const user = userEvent.setup();
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
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    await user.click(screen.getByText('alice'));
    await waitFor(() => {
      expect(screen.getByText('Chrome')).toBeInTheDocument();
    });
    expect(screen.getByTestId('device-row-d1')).toHaveAttribute('data-transition', 'UNCHANGED');
  });

  it('shows device-fetch error', async () => {
    const user = userEvent.setup();
    getUsers.mockResolvedValue([{ id: 'u1', name: 'alice', deviceCount: 1 }]);
    getUserDevices.mockRejectedValue(new Error('device boom'));

    render(<UserDevicesList />);
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    await user.click(screen.getByText('alice'));
    await waitFor(() => {
      expect(screen.getByText('device boom')).toBeInTheDocument();
    });
  });
});
