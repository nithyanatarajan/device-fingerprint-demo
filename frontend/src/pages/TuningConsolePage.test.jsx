import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TuningConsolePage from './TuningConsolePage';

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
