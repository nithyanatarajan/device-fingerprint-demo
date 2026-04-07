import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SameMachinePanel, { formatRelativeTime } from './SameMachinePanel';

const STRONG_CAVEAT = /Other browsers seen with the same hardware/;
const POSSIBLE_CAVEAT = /Could be the same machine on a different Wi-Fi or VPN/;
const FOOTER_CAVEAT = /Identical hardware may match across unrelated machines/;

function makeMatch(overrides = {}) {
  return {
    userId: 'u1',
    userName: 'testuser',
    deviceId: 'd1',
    deviceLabel: 'Chrome on MacOS',
    lastSeenAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

describe('SameMachinePanel', () => {
  it('renders null when both props are undefined', () => {
    const { container } = render(<SameMachinePanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when both lists are explicitly empty', () => {
    const { container } = render(<SameMachinePanel strongMatches={[]} possibleMatches={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders only the strong section when only strongMatches is non-empty', () => {
    render(
      <SameMachinePanel
        strongMatches={[makeMatch({ userName: 'userA', deviceLabel: 'Chrome on MacOS' })]}
        possibleMatches={[]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Same machine', exact: true })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Matching hardware', exact: true }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Chrome on MacOS \u00B7 userA')).toBeInTheDocument();
    expect(screen.queryByText(POSSIBLE_CAVEAT)).not.toBeInTheDocument();
  });

  it('renders only the possible section when only possibleMatches is non-empty', () => {
    render(
      <SameMachinePanel
        strongMatches={[]}
        possibleMatches={[
          makeMatch({
            userId: 'u2',
            deviceId: 'd2',
            userName: 'userB',
            deviceLabel: 'Firefox on Linux',
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Matching hardware', exact: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Same machine', exact: true }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Firefox on Linux \u00B7 userB')).toBeInTheDocument();
    expect(screen.getByText(POSSIBLE_CAVEAT)).toBeInTheDocument();
  });

  it('renders both sections when both lists are non-empty', () => {
    render(
      <SameMachinePanel
        strongMatches={[
          makeMatch({ userId: 'u1', deviceId: 'd1', userName: 'userA', deviceLabel: 'Chrome' }),
        ]}
        possibleMatches={[
          makeMatch({
            userId: 'u2',
            deviceId: 'd2',
            userName: 'userB',
            deviceLabel: 'Safari on iOS',
          }),
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Same machine', exact: true })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Matching hardware', exact: true }),
    ).toBeInTheDocument();
    expect(screen.getByText('Chrome \u00B7 userA')).toBeInTheDocument();
    expect(screen.getByText('Safari on iOS \u00B7 userB')).toBeInTheDocument();
  });

  it('renders relative time for each row across both sections', () => {
    render(
      <SameMachinePanel
        strongMatches={[
          makeMatch({
            userId: 'u1',
            deviceId: 'd1',
            userName: 'userA',
            lastSeenAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          }),
        ]}
        possibleMatches={[
          makeMatch({
            userId: 'u2',
            deviceId: 'd2',
            userName: 'userB',
            lastSeenAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          }),
        ]}
      />,
    );

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('3 hours ago')).toBeInTheDocument();
  });

  it('renders the strong-section caveat when strong section is shown', () => {
    render(<SameMachinePanel strongMatches={[makeMatch()]} possibleMatches={[]} />);
    expect(screen.getByText(STRONG_CAVEAT)).toBeInTheDocument();
  });

  it('renders the possible-section caveat when possible section is shown', () => {
    render(<SameMachinePanel strongMatches={[]} possibleMatches={[makeMatch()]} />);
    expect(screen.getByText(POSSIBLE_CAVEAT)).toBeInTheDocument();
  });

  it('renders the footer caveat when at least one section is shown', () => {
    render(<SameMachinePanel strongMatches={[makeMatch()]} possibleMatches={[]} />);
    expect(screen.getByText(FOOTER_CAVEAT)).toBeInTheDocument();
  });

  it('renders the footer caveat when only the possible section is shown', () => {
    render(<SameMachinePanel strongMatches={[]} possibleMatches={[makeMatch()]} />);
    expect(screen.getByText(FOOTER_CAVEAT)).toBeInTheDocument();
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
