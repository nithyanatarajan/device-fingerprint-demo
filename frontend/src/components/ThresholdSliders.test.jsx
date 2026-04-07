import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ThresholdSliders from './ThresholdSliders';

vi.mock('../services/api', () => ({
  getScoringConfig: vi.fn(),
  updateScoringConfig: vi.fn(),
  resetScoringConfig: vi.fn(),
}));

import { getScoringConfig, updateScoringConfig, resetScoringConfig } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ThresholdSliders', () => {
  it('fetches config on mount and renders both sliders', async () => {
    getScoringConfig.mockResolvedValue({ sameDeviceThreshold: 85, driftThreshold: 60 });

    render(<ThresholdSliders />);

    await waitFor(() => {
      expect(screen.getByText('Same-device threshold')).toBeInTheDocument();
    });
    expect(screen.getByText('Drift threshold')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('clamps drift down when same-device is dragged below it', async () => {
    getScoringConfig.mockResolvedValue({ sameDeviceThreshold: 85, driftThreshold: 60 });

    const onChange = vi.fn();
    render(<ThresholdSliders onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByText('Same-device threshold')).toBeInTheDocument();
    });

    const sameSlider = screen.getByLabelText('same-device threshold');
    // Simulate slider change to 50 (below current drift of 60)
    fireEvent.change(sameSlider, { target: { value: 50 } });

    await waitFor(() => {
      // drift should clamp down to 50 (or below)
      const drifts = screen.getAllByText(/^\d+$/);
      const driftValues = drifts.map((el) => parseInt(el.textContent, 10));
      // both should now be <= 50
      expect(driftValues.every((v) => v <= 50)).toBe(true);
    });
  });

  it('clamps same-device up when drift is dragged above it', async () => {
    getScoringConfig.mockResolvedValue({ sameDeviceThreshold: 50, driftThreshold: 30 });

    const onChange = vi.fn();
    render(<ThresholdSliders onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByText('Drift threshold')).toBeInTheDocument();
    });

    const driftSlider = screen.getByLabelText('drift threshold');
    fireEvent.change(driftSlider, { target: { value: 80 } });

    await waitFor(() => {
      // both values should be 80 since drift was pushed up to 80, same clamps up to match
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.driftThreshold).toBe(80);
      expect(lastCall.sameDeviceThreshold).toBeGreaterThanOrEqual(80);
    });
  });

  it('saves to API on Save click', async () => {
    const user = userEvent.setup();
    const initial = { sameDeviceThreshold: 85, driftThreshold: 60 };
    getScoringConfig.mockResolvedValue(initial);
    updateScoringConfig.mockResolvedValue(initial);

    render(<ThresholdSliders />);
    await waitFor(() => {
      expect(screen.getByText('Same-device threshold')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Save thresholds' }));

    await waitFor(() => {
      expect(updateScoringConfig).toHaveBeenCalledWith(initial);
    });
  });

  it('reset calls POST /config/reset and applies the canonical defaults without unmounting sliders', async () => {
    const user = userEvent.setup();
    // Server starts with polluted thresholds
    getScoringConfig.mockResolvedValue({ sameDeviceThreshold: 33, driftThreshold: 22 });
    resetScoringConfig.mockResolvedValue({ sameDeviceThreshold: 85, driftThreshold: 60 });

    render(<ThresholdSliders />);
    await waitFor(() => {
      expect(screen.getByText('Same-device threshold')).toBeInTheDocument();
    });
    expect(screen.getByText('33')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));

    await waitFor(() => {
      expect(resetScoringConfig).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });
    expect(screen.getByText('60')).toBeInTheDocument();
    // Sliders stay mounted throughout reset
    expect(screen.getByLabelText('same-device threshold')).toBeInTheDocument();
    expect(screen.getByLabelText('drift threshold')).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    getScoringConfig.mockRejectedValue(new Error('config fail'));
    render(<ThresholdSliders />);
    await waitFor(() => {
      expect(screen.getByText('config fail')).toBeInTheDocument();
    });
  });

  it('shows error when reset fails', async () => {
    const user = userEvent.setup();
    getScoringConfig.mockResolvedValue({ sameDeviceThreshold: 33, driftThreshold: 22 });
    resetScoringConfig.mockRejectedValue(new Error('reset boom'));

    render(<ThresholdSliders />);
    await waitFor(() => {
      expect(screen.getByText('Same-device threshold')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));

    await waitFor(() => {
      expect(screen.getByText('reset boom')).toBeInTheDocument();
    });
  });
});
