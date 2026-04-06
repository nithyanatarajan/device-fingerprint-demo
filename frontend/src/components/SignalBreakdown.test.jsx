import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SignalBreakdown from './SignalBreakdown';

describe('SignalBreakdown', () => {
  it('renders signal names and values', () => {
    const signals = {
      platform: 'MacIntel',
      timezone: 'America/New_York',
    };

    render(<SignalBreakdown signals={signals} />);

    expect(screen.getByText('platform')).toBeInTheDocument();
    expect(screen.getByText('MacIntel')).toBeInTheDocument();
    expect(screen.getByText('timezone')).toBeInTheDocument();
    expect(screen.getByText('America/New_York')).toBeInTheDocument();
  });

  it('returns null when no signals', () => {
    const { container } = render(<SignalBreakdown signals={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null for empty signals object', () => {
    const { container } = render(<SignalBreakdown signals={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('highlights changed signals', () => {
    const signals = { platform: 'MacIntel', timezone: 'UTC' };
    render(<SignalBreakdown signals={signals} changedSignals={['timezone']} />);

    expect(screen.getByText('timezone')).toBeInTheDocument();
    expect(screen.getByText('UTC')).toBeInTheDocument();
  });
});
