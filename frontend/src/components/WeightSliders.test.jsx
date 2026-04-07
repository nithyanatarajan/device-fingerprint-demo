import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WeightSliders from './WeightSliders';

vi.mock('../services/api', () => ({
  getScoringWeights: vi.fn(),
  updateScoringWeights: vi.fn(),
  resetScoringWeights: vi.fn(),
}));

import { getScoringWeights, updateScoringWeights, resetScoringWeights } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WeightSliders', () => {
  it('fetches weights on mount and renders a slider per signal', async () => {
    getScoringWeights.mockResolvedValue({
      canvas_hash: { weight: 90, enabled: true },
      platform: { weight: 60, enabled: true },
    });

    render(<WeightSliders />);

    await waitFor(() => {
      expect(screen.getByText('canvas_hash')).toBeInTheDocument();
    });
    expect(screen.getByText('platform')).toBeInTheDocument();
    expect(screen.getByLabelText('canvas_hash weight')).toBeInTheDocument();
    expect(screen.getByLabelText('platform weight')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('updates the displayed value when a slider changes', async () => {
    const user = userEvent.setup();
    getScoringWeights.mockResolvedValue({
      canvas_hash: { weight: 90, enabled: true },
    });

    const onChange = vi.fn();
    render(<WeightSliders onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByText('canvas_hash')).toBeInTheDocument();
    });

    const slider = screen.getByLabelText('canvas_hash weight');
    slider.focus();
    // ArrowDown decreases by step
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getByText('89')).toBeInTheDocument();
    });
    expect(onChange).toHaveBeenCalled();
  });

  it('toggles enabled via the switch', async () => {
    const user = userEvent.setup();
    getScoringWeights.mockResolvedValue({
      canvas_hash: { weight: 90, enabled: true },
    });

    render(<WeightSliders />);
    await waitFor(() => {
      expect(screen.getByText('canvas_hash')).toBeInTheDocument();
    });

    const sw = screen.getByTestId('switch-canvas_hash').querySelector('input');
    expect(sw).toBeChecked();
    await user.click(sw);
    expect(sw).not.toBeChecked();
  });

  it('calls updateScoringWeights when Save is clicked', async () => {
    const user = userEvent.setup();
    const initial = { canvas_hash: { weight: 90, enabled: true } };
    getScoringWeights.mockResolvedValue(initial);
    updateScoringWeights.mockResolvedValue(initial);

    render(<WeightSliders />);
    await waitFor(() => {
      expect(screen.getByText('canvas_hash')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Save weights' }));

    await waitFor(() => {
      expect(updateScoringWeights).toHaveBeenCalledWith(initial);
    });
  });

  it('reset calls POST /weights/reset and applies the canonical defaults without unmounting sliders', async () => {
    const user = userEvent.setup();
    // Server starts with a polluted weight value (canvas at 7) so we can prove
    // reset actually moved it back to the canonical default returned by the API.
    getScoringWeights.mockResolvedValue({ canvas_hash: { weight: 7, enabled: false } });
    resetScoringWeights.mockResolvedValue({ canvas_hash: { weight: 90, enabled: true } });

    render(<WeightSliders />);
    await waitFor(() => {
      expect(screen.getByText('canvas_hash')).toBeInTheDocument();
    });
    expect(screen.getByText('7')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));

    await waitFor(() => {
      expect(resetScoringWeights).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('90')).toBeInTheDocument();
    });
    // Slider stays mounted throughout — the previous bug was that handleReset
    // toggled the global loading flag, which unmounted every slider mid-click.
    expect(screen.getByLabelText('canvas_hash weight')).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    getScoringWeights.mockRejectedValue(new Error('boom'));
    render(<WeightSliders />);
    await waitFor(() => {
      expect(screen.getByText('boom')).toBeInTheDocument();
    });
  });

  it('shows error when reset fails', async () => {
    const user = userEvent.setup();
    getScoringWeights.mockResolvedValue({ canvas_hash: { weight: 7, enabled: true } });
    resetScoringWeights.mockRejectedValue(new Error('reset boom'));

    render(<WeightSliders />);
    await waitFor(() => {
      expect(screen.getByText('canvas_hash')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));

    await waitFor(() => {
      expect(screen.getByText('reset boom')).toBeInTheDocument();
    });
  });
});
