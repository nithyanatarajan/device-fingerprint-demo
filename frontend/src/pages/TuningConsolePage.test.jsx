import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TuningConsolePage from './TuningConsolePage';

vi.mock('../services/api', () => ({
  getScoringWeights: vi.fn(),
  updateScoringWeights: vi.fn(),
  resetScoringWeights: vi.fn(),
  getScoringConfig: vi.fn(),
  updateScoringConfig: vi.fn(),
  resetScoringConfig: vi.fn(),
  getUsers: vi.fn().mockResolvedValue([]),
  getUserDevices: vi.fn().mockResolvedValue([]),
  seedDemoUser: vi.fn(),
  getSeedSummary: vi.fn().mockResolvedValue({ users: 0, devices: 0, fingerprints: 0 }),
  clearSeedData: vi.fn(),
  seedScenario: vi.fn(),
  previewScoring: vi.fn(),
}));

import { getScoringWeights, getScoringConfig, previewScoring } from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
  getScoringWeights.mockResolvedValue({});
  getScoringConfig.mockResolvedValue({ sameDeviceThreshold: 85, driftThreshold: 60 });
  previewScoring.mockResolvedValue({ users: [], summary: {} });
});

describe('TuningConsolePage', () => {
  it('renders the page title', () => {
    render(<TuningConsolePage />);
    expect(screen.getByRole('heading', { name: 'Tuning Console', level: 4 })).toBeInTheDocument();
  });

  it('renders the Tune tab content by default — sliders and devices, no Demo Data', () => {
    render(<TuningConsolePage />);
    expect(screen.getByRole('heading', { name: 'Signal Weights', level: 6 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thresholds', level: 6 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Users & Devices', level: 6 })).toBeInTheDocument();
    // Both tabs exist; Tune is selected by default
    expect(screen.getByRole('tab', { name: 'Tune', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Demo Data', selected: false })).toBeInTheDocument();
  });

  it('switches to the Demo Data tab when clicked', async () => {
    const user = userEvent.setup();
    render(<TuningConsolePage />);
    await user.click(screen.getByRole('tab', { name: 'Demo Data' }));
    // Demo Data section is now visible
    expect(screen.getByRole('heading', { name: 'Demo Data', level: 6 })).toBeInTheDocument();
    expect(screen.getByLabelText('User name')).toBeInTheDocument();
  });

  it('shows the idle preview hint when there is no preview yet', () => {
    render(<TuningConsolePage />);
    expect(screen.getByTestId('preview-summary-banner')).toBeInTheDocument();
    expect(screen.getByText(/Drag any weight or threshold slider/)).toBeInTheDocument();
  });

  it('shows affected count when preview returns affected devices', async () => {
    getScoringWeights.mockResolvedValue({ canvas_hash: { weight: 90, enabled: true } });
    previewScoring.mockResolvedValue({
      users: [
        {
          userId: 'u1',
          userName: 'alice',
          devices: [
            {
              deviceId: 'd1',
              deviceLabel: 'Chrome',
              fingerprintCount: 2,
              currentClassification: 'NEW_DEVICE',
              proposedClassification: 'SAME_DEVICE',
              currentScore: 0,
              proposedScore: 90,
              transition: 'PROMOTED',
            },
          ],
        },
      ],
      summary: {
        totalUsers: 1,
        totalDevices: 1,
        totalFingerprints: 2,
        affectedDevices: 1,
        promotedCount: 1,
        demotedCount: 0,
        unchangedCount: 0,
      },
    });

    render(<TuningConsolePage />);

    await waitFor(() => {
      expect(previewScoring).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/1 device\(s\) affected/)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 promoted/)).toBeInTheDocument();
  });
});
