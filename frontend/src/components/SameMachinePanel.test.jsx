import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SameMachinePanel, { formatRelativeTime } from './SameMachinePanel';

describe('SameMachinePanel', () => {
  it('renders null when matches is undefined', () => {
    const { container } = render(<SameMachinePanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when matches is an empty array', () => {
    const { container } = render(<SameMachinePanel matches={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the title when matches is non-empty', () => {
    const matches = [
      {
        userId: 'u1',
        userName: 'testuser',
        deviceId: 'd1',
        deviceLabel: 'Chrome on MacOS',
        lastSeenAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ];
    render(<SameMachinePanel matches={matches} />);
    expect(screen.getByRole('heading', { name: 'Same machine' })).toBeInTheDocument();
  });

  it('renders one row per match with expected primary text', () => {
    const matches = [
      {
        userId: 'u1',
        userName: 'userA',
        deviceId: 'd1',
        deviceLabel: 'Chrome on MacOS',
        lastSeenAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
      {
        userId: 'u2',
        userName: 'userB',
        deviceId: 'd2',
        deviceLabel: 'Firefox on Linux',
        lastSeenAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ];
    render(<SameMachinePanel matches={matches} />);
    expect(screen.getByText('Chrome on MacOS \u00B7 userA')).toBeInTheDocument();
    expect(screen.getByText('Firefox on Linux \u00B7 userB')).toBeInTheDocument();
  });

  it('renders relative time for each match', () => {
    const matches = [
      {
        userId: 'u1',
        userName: 'userA',
        deviceId: 'd1',
        deviceLabel: 'Chrome',
        lastSeenAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ];
    render(<SameMachinePanel matches={matches} />);
    expect(screen.getByText(/minutes ago/)).toBeInTheDocument();
  });

  it('renders the footer caveat text', () => {
    const matches = [
      {
        userId: 'u1',
        userName: 'userA',
        deviceId: 'd1',
        deviceLabel: 'Chrome',
        lastSeenAt: new Date().toISOString(),
      },
    ];
    render(<SameMachinePanel matches={matches} />);
    expect(screen.getByText(/Based on device hardware and network/)).toBeInTheDocument();
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-04-07T12:00:00Z').getTime();

  it('returns "just now" for under 60 seconds', () => {
    const iso = new Date(now - 30 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe('just now');
  });

  it('returns "1 minute ago" for 1 minute', () => {
    const iso = new Date(now - 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe('1 minute ago');
  });

  it('returns "N minutes ago" for minutes', () => {
    const iso = new Date(now - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe('5 minutes ago');
  });

  it('returns "1 hour ago" for 1 hour', () => {
    const iso = new Date(now - 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe('1 hour ago');
  });

  it('returns "N hours ago" for hours', () => {
    const iso = new Date(now - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe('3 hours ago');
  });

  it('returns "1 day ago" for 1 day', () => {
    const iso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe('1 day ago');
  });

  it('returns "N days ago" for days', () => {
    const iso = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe('4 days ago');
  });

  it('returns empty string for invalid date', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});
