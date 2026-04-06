import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

vi.mock('./services/fingerprint', () => ({
  collectSignals: vi.fn(),
}));

vi.mock('./services/api', () => ({
  collectFingerprint: vi.fn(),
}));

describe('App', () => {
  it('renders navigation links', () => {
    render(<App />);

    expect(screen.getByText('Device Identification Platform')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collect' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tuning Console' })).toBeInTheDocument();
  });

  it('renders the collection page by default', () => {
    render(<App />);

    expect(screen.getByLabelText('Enter your name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Identify' })).toBeInTheDocument();
  });

  it('navigates to tuning console when clicking the button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Tuning Console' }));

    expect(screen.getByText('Tuning Console', { selector: 'h5' })).toBeInTheDocument();
    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });
});
