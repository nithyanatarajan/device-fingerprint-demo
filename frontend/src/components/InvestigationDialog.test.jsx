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
      visitCount: 0,
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
    // Title shows the device label
    expect(screen.getByText('Chrome on Mac')).toBeInTheDocument();
    // Visit timeline section header is present even with 0 visits
    expect(screen.getByText(/Visit history/)).toBeInTheDocument();
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

  it('renders the match explanation panel, comparison table, and visit timeline for multi-visit devices', async () => {
    getDeviceInvestigation.mockResolvedValue({
      deviceId: 'd1',
      deviceLabel: 'Chrome on MacOS',
      visitCount: 2,
      visits: [
        {
          fingerprintId: 'fp1',
          collectedAt: '2026-04-08T01:00:00Z',
          publicIp: '203.0.113.42',
          machineSignature: 'aaaaaaaaaaaaaaaa',
          signals: {},
        },
        {
          fingerprintId: 'fp2',
          collectedAt: '2026-04-08T00:00:00Z',
          publicIp: '203.0.113.42',
          machineSignature: 'aaaaaaaaaaaaaaaa',
          signals: {},
        },
      ],
      matchExplanation: {
        compositeScore: 75.0,
        classification: 'DRIFT_DETECTED',
        sameDeviceThreshold: 85,
        driftThreshold: 60,
        contributions: [
          {
            signalName: 'canvas_hash',
            weight: 90,
            enabled: true,
            latestValue: 'NEW_HASH',
            previousValue: 'OLD_HASH',
            similarityScore: 0,
            weightedContribution: 0,
          },
          {
            signalName: 'webgl_renderer',
            weight: 85,
            enabled: true,
            latestValue: 'Apple GPU',
            previousValue: 'Apple GPU',
            similarityScore: 1,
            weightedContribution: 13.7,
          },
          {
            signalName: 'platform',
            weight: 60,
            enabled: true,
            latestValue: 'MacIntel',
            previousValue: 'MacIntel',
            similarityScore: 1,
            weightedContribution: 9.7,
          },
          {
            signalName: 'cookie_enabled',
            weight: 5,
            enabled: false,
            latestValue: true,
            previousValue: true,
            similarityScore: 1,
            weightedContribution: 0,
          },
        ],
      },
    });

    render(
      <InvestigationDialog
        open
        userId="u1"
        deviceId="d1"
        deviceLabel="Chrome on MacOS"
        onClose={() => {}}
      />,
    );

    // Match explanation panel
    await waitFor(() => {
      expect(screen.getByTestId('match-explanation-panel')).toBeInTheDocument();
    });
    expect(screen.getByText('75.0')).toBeInTheDocument();
    expect(screen.getByText('DRIFT_DETECTED')).toBeInTheDocument();
    // Top contributors and lost confidence — these signal names appear in
    // both the panel and the comparison table, so use getAllByText.
    expect(screen.getAllByText(/webgl_renderer/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/canvas_hash/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/OLD_HASH → NEW_HASH/)).toBeInTheDocument();

    // Comparison table renders all 4 contributions including the disabled one
    expect(screen.getByTestId('signal-comparison-table')).toBeInTheDocument();
    expect(screen.getByTestId('signal-row-canvas_hash')).toHaveAttribute('data-similarity', '0');
    expect(screen.getByTestId('signal-row-webgl_renderer')).toHaveAttribute('data-similarity', '1');
    expect(screen.getByTestId('signal-row-cookie_enabled')).toBeInTheDocument();

    // Visit timeline renders both visits with the latest one chip-tagged
    expect(screen.getByTestId('visit-timeline')).toBeInTheDocument();
    expect(screen.getByText('latest')).toBeInTheDocument();
  });

  it('renders the no-history alert for single-fingerprint devices', async () => {
    getDeviceInvestigation.mockResolvedValue({
      deviceId: 'd1',
      visitCount: 1,
      visits: [
        {
          fingerprintId: 'fp1',
          collectedAt: '2026-04-08T01:00:00Z',
          publicIp: '203.0.113.42',
          machineSignature: 'aaaaaaaaaaaaaaaa',
          signals: {},
        },
      ],
      matchExplanation: null,
    });

    render(<InvestigationDialog open userId="u1" deviceId="d1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/only one fingerprint/)).toBeInTheDocument();
    });
    // No comparison table
    expect(screen.queryByTestId('signal-comparison-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('match-explanation-panel')).not.toBeInTheDocument();
    // But the visit timeline still renders
    expect(screen.getByTestId('visit-timeline')).toBeInTheDocument();
  });
});
