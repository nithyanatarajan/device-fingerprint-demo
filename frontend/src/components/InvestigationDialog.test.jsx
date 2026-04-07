import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvestigationDialog from './InvestigationDialog';

vi.mock('../services/api', () => ({
  getDeviceInvestigation: vi.fn(),
}));

import { getDeviceInvestigation } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InvestigationDialog', () => {
  it('renders nothing visible when closed', () => {
    render(<InvestigationDialog open={false} onClose={() => {}} />);
    expect(screen.queryByTestId('investigation-dialog')).not.toBeInTheDocument();
    expect(getDeviceInvestigation).not.toHaveBeenCalled();
  });

  it('fetches the investigation payload when opened with userId and deviceId', async () => {
    getDeviceInvestigation.mockResolvedValue({
      deviceId: 'd1',
      deviceLabel: 'Chrome on Mac',
      visitCount: 2,
      visits: [],
      matchExplanation: null,
    });

    render(
      <InvestigationDialog
        open
        userId="u1"
        deviceId="d1"
        deviceLabel="Chrome on Mac"
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(getDeviceInvestigation).toHaveBeenCalledWith('u1', 'd1');
    });
    await waitFor(() => {
      expect(screen.getByTestId('investigation-content')).toBeInTheDocument();
    });
    expect(screen.getByText(/2 visit\(s\)/)).toBeInTheDocument();
    // Title shows the device label
    expect(screen.getByText('Chrome on Mac')).toBeInTheDocument();
  });

  it('shows an error alert when the fetch fails', async () => {
    getDeviceInvestigation.mockRejectedValue(new Error('investigation boom'));

    render(<InvestigationDialog open userId="u1" deviceId="d1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('investigation boom')).toBeInTheDocument();
    });
  });

  it('calls onClose when the Close button is clicked', async () => {
    const user = userEvent.setup();
    getDeviceInvestigation.mockResolvedValue({
      deviceId: 'd1',
      visitCount: 1,
      visits: [],
      matchExplanation: null,
    });
    const onClose = vi.fn();

    render(<InvestigationDialog open userId="u1" deviceId="d1" onClose={onClose} />);

    await waitFor(() => expect(getDeviceInvestigation).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
  });
});
