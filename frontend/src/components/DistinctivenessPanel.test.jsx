import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DistinctivenessPanel from './DistinctivenessPanel';

vi.mock('../services/api', () => ({
  getSignalDistinctiveness: vi.fn(),
}));

import { getSignalDistinctiveness } from '../services/api';

function samplePayload(overrides = {}) {
  return {
    fingerprintId: 'fp-1',
    totalFingerprints: 4,
    fullFingerprintMatchCount: 1,
    signals: [
      { signalName: 'platform', value: 'MacIntel', matchCount: 3, distinctValues: 2 },
      { signalName: 'canvas_hash', value: 'HASH_A', matchCount: 1, distinctValues: 4 },
      { signalName: 'user_agent', value: null, matchCount: 2, distinctValues: 3 },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DistinctivenessPanel', () => {
  it('renders nothing when no fingerprintId is provided', () => {
    const { container } = render(<DistinctivenessPanel />);
    expect(container.firstChild).toBeNull();
    expect(getSignalDistinctiveness).not.toHaveBeenCalled();
  });

  it('fetches and renders the distinctiveness payload', async () => {
    getSignalDistinctiveness.mockResolvedValue(samplePayload());

    render(<DistinctivenessPanel fingerprintId="fp-1" />);

    await waitFor(() => {
      expect(getSignalDistinctiveness).toHaveBeenCalledWith('fp-1');
    });
    expect(await screen.findByTestId('distinctiveness-panel')).toBeInTheDocument();
    expect(
      screen.getByText(/combined 15-signal fingerprint is unique among 4 stored fingerprints/i),
    ).toBeInTheDocument();
    // Counts view is the default — look for a K-of-N cell.
    expect(screen.getByText('3 of 4')).toBeInTheDocument();
    expect(screen.getByText('1 of 4')).toBeInTheDocument();
  });

  it('reports full-fingerprint collisions when fullFingerprintMatchCount > 1', async () => {
    getSignalDistinctiveness.mockResolvedValue(
      samplePayload({ fullFingerprintMatchCount: 2, totalFingerprints: 5 }),
    );

    render(<DistinctivenessPanel fingerprintId="fp-1" />);

    expect(
      await screen.findByText(/combined 15-signal fingerprint matches 2 of 5 stored fingerprints/i),
    ).toBeInTheDocument();
  });

  it('renders null values as "null"', async () => {
    getSignalDistinctiveness.mockResolvedValue(samplePayload());
    render(<DistinctivenessPanel fingerprintId="fp-1" />);
    await screen.findByTestId('distinctiveness-panel');
    expect(screen.getByText('null')).toBeInTheDocument();
  });

  it('toggles between counts and ratio views', async () => {
    getSignalDistinctiveness.mockResolvedValue(samplePayload());
    const user = userEvent.setup();

    render(<DistinctivenessPanel fingerprintId="fp-1" />);
    await screen.findByTestId('distinctiveness-panel');

    // Default = counts
    expect(screen.getByText('3 of 4')).toBeInTheDocument();
    expect(screen.queryByText('75%')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /uniqueness ratio/i }));

    // Ratio view = 3/4 = 75%, 1/4 = 25%, 2/4 = 50%
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText('3 of 4')).not.toBeInTheDocument();
  });

  it('uses singular "fingerprint" when the population is exactly 1', async () => {
    getSignalDistinctiveness.mockResolvedValue(
      samplePayload({ totalFingerprints: 1, signals: [] }),
    );
    render(<DistinctivenessPanel fingerprintId="fp-1" />);
    expect(await screen.findByText(/unique among 1 stored fingerprint\./i)).toBeInTheDocument();
  });

  it('formats ratios with one decimal below 10% and whole numbers above', async () => {
    getSignalDistinctiveness.mockResolvedValue(
      samplePayload({
        totalFingerprints: 200,
        signals: [
          // 1/200 = 0.5% — below 10%, one decimal
          { signalName: 'canvas_hash', value: 'A', matchCount: 1, distinctValues: 200 },
          // 50/200 = 25% — above 10%, whole number
          { signalName: 'platform', value: 'MacIntel', matchCount: 50, distinctValues: 4 },
        ],
      }),
    );
    const user = userEvent.setup();

    render(<DistinctivenessPanel fingerprintId="fp-1" />);
    await screen.findByTestId('distinctiveness-panel');
    await user.click(screen.getByRole('button', { name: /uniqueness ratio/i }));

    expect(screen.getByText('0.5%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('shows an error alert when the fetch fails', async () => {
    getSignalDistinctiveness.mockRejectedValue(new Error('boom'));

    render(<DistinctivenessPanel fingerprintId="fp-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Could not load signal distinctiveness: boom/)).toBeInTheDocument();
    });
  });

  it('re-fetches when the fingerprintId prop changes', async () => {
    getSignalDistinctiveness.mockResolvedValue(samplePayload());
    const { rerender } = render(<DistinctivenessPanel fingerprintId="fp-1" />);
    await waitFor(() => {
      expect(getSignalDistinctiveness).toHaveBeenCalledWith('fp-1');
    });

    rerender(<DistinctivenessPanel fingerprintId="fp-2" />);
    await waitFor(() => {
      expect(getSignalDistinctiveness).toHaveBeenCalledWith('fp-2');
    });
  });
});
