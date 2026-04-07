import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TuningConsolePage from './TuningConsolePage';

vi.mock('../services/api', () => ({
  getScoringWeights: vi.fn().mockResolvedValue({}),
  updateScoringWeights: vi.fn(),
  getScoringConfig: vi.fn().mockResolvedValue({ sameDeviceThreshold: 85, driftThreshold: 60 }),
  updateScoringConfig: vi.fn(),
  getUsers: vi.fn().mockResolvedValue([]),
  getUserDevices: vi.fn().mockResolvedValue([]),
}));

describe('TuningConsolePage', () => {
  it('renders the page title', () => {
    render(<TuningConsolePage />);
    expect(screen.getByRole('heading', { name: 'Tuning Console', level: 4 })).toBeInTheDocument();
  });

  it('renders all five section headings', () => {
    render(<TuningConsolePage />);
    expect(screen.getByRole('heading', { name: 'Demo Data', level: 6 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Signal Weights', level: 6 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thresholds', level: 6 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Users & Devices', level: 6 })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Live Preview Summary', level: 6 }),
    ).toBeInTheDocument();
  });
});
