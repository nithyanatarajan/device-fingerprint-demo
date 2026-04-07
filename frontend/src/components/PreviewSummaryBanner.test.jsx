import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PreviewSummaryBanner from './PreviewSummaryBanner';

describe('PreviewSummaryBanner', () => {
  it('renders the idle hint and high-leverage tip when summary is null', () => {
    render(<PreviewSummaryBanner summary={null} />);
    expect(screen.getByTestId('preview-summary-banner')).toBeInTheDocument();
    expect(screen.getByText(/Drag any weight or threshold slider/)).toBeInTheDocument();
    expect(
      screen.getByText(/canvas_hash \(90\), webgl_renderer \(85\), and touch_support \(70\)/),
    ).toBeInTheDocument();
  });

  it('renders a "no impact" state with the tip when affectedDevices is 0', () => {
    render(
      <PreviewSummaryBanner
        summary={{
          totalUsers: 2,
          totalDevices: 3,
          totalFingerprints: 5,
          affectedDevices: 0,
          promotedCount: 0,
          demotedCount: 0,
        }}
      />,
    );
    expect(screen.getByText(/no impact/)).toBeInTheDocument();
    expect(screen.getByText(/3 device\(s\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/canvas_hash \(90\), webgl_renderer \(85\), and touch_support \(70\)/),
    ).toBeInTheDocument();
  });

  it('renders the affected counts', () => {
    render(
      <PreviewSummaryBanner
        summary={{
          totalUsers: 1,
          totalDevices: 4,
          totalFingerprints: 8,
          affectedDevices: 4,
          promotedCount: 3,
          demotedCount: 1,
        }}
      />,
    );
    const banner = screen.getByTestId('preview-summary-banner');
    expect(banner).toHaveTextContent(/4 device\(s\) affected/);
    expect(banner).toHaveTextContent(/3 promoted/);
    expect(banner).toHaveTextContent(/1 demoted/);
    expect(banner).toHaveTextContent(/8 fingerprint\(s\) evaluated/);
  });
});
