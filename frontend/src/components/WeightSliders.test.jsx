import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WeightSliders from './WeightSliders';

vi.mock('../services/api', () => ({
  getScoringWeights: vi.fn(),
  updateScoringWeights: vi.fn(),
}));

import { getScoringWeights, updateScoringWeights } from '../services/api';

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

  it('reset re-fetches from server', async () => {
    const user = userEvent.setup();
    getScoringWeights.mockResolvedValue({ canvas_hash: { weight: 90, enabled: true } });

    render(<WeightSliders />);
    await waitFor(() => {
      expect(screen.getByText('canvas_hash')).toBeInTheDocument();
    });

    getScoringWeights.mockClear();
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));

    await waitFor(() => {
      expect(getScoringWeights).toHaveBeenCalled();
    });
  });

  it('shows error when fetch fails', async () => {
    getScoringWeights.mockRejectedValue(new Error('boom'));
    render(<WeightSliders />);
    await waitFor(() => {
      expect(screen.getByText('boom')).toBeInTheDocument();
    });
  });
});
