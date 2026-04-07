import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PreviewSummaryBanner from './PreviewSummaryBanner';

describe('PreviewSummaryBanner', () => {
  it('renders nothing when summary is null', () => {
    const { container } = render(<PreviewSummaryBanner summary={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when affectedDevices is 0', () => {
    const { container } = render(
      <PreviewSummaryBanner summary={{ affectedDevices: 0, promotedCount: 0, demotedCount: 0 }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the affected counts', () => {
    render(
      <PreviewSummaryBanner summary={{ affectedDevices: 4, promotedCount: 3, demotedCount: 1 }} />,
    );
    expect(screen.getByTestId('preview-summary-banner')).toHaveTextContent(
      'This change affects 4 device(s). 3 promoted, 1 demoted.',
    );
  });
});
