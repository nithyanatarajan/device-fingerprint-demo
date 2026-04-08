import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CapturePanel from './CapturePanel';

// Mock html2canvas so tests don't have to render real DOM to a canvas. The
// mock returns a fake canvas whose toBlob immediately invokes the callback
// with a tiny PNG-shaped blob.
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toBlob: (cb) => cb(new Blob(['fake-png'], { type: 'image/png' })),
  }),
}));

import html2canvas from 'html2canvas';

describe('CapturePanel', () => {
  let createObjectURLSpy;
  let revokeObjectURLSpy;
  let clickSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURLSpy = vi.fn(() => 'blob:fake-url');
    revokeObjectURLSpy = vi.fn();
    // jsdom doesn't implement URL.createObjectURL; stub both methods.
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    });
    // Spy on the anchor click so we can count download triggers.
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('renders with the scenario number input and the download button', () => {
    render(<CapturePanel payload={null} response={null} screenshotTargetRef={{ current: null }} />);
    expect(screen.getByTestId('capture-panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Scenario #')).toHaveValue('1');
    // Download button is disabled until there's data
    expect(screen.getByRole('button', { name: /Download captures/i })).toBeDisabled();
    expect(screen.getByText(/Run a collect call first/)).toBeInTheDocument();
  });

  it('enables the download button once payload and response are provided', () => {
    render(
      <CapturePanel
        payload={{ name: 'nithya' }}
        response={{ matchResult: 'NEW_DEVICE' }}
        screenshotTargetRef={{ current: document.createElement('div') }}
      />,
    );
    expect(screen.getByRole('button', { name: /Download captures/i })).toBeEnabled();
    expect(screen.queryByText(/Run a collect call first/)).not.toBeInTheDocument();
  });

  it('downloads three files (payload, response, screenshot) when clicked', async () => {
    const user = userEvent.setup();
    const fakeTarget = document.createElement('div');
    render(
      <CapturePanel
        payload={{ name: 'nithya' }}
        response={{ matchResult: 'NEW_DEVICE' }}
        screenshotTargetRef={{ current: fakeTarget }}
      />,
    );

    const input = screen.getByLabelText('Scenario #');
    await user.clear(input);
    await user.type(input, '7');

    await user.click(screen.getByRole('button', { name: /Download captures/i }));

    await waitFor(() => {
      expect(screen.getByTestId('capture-success')).toBeInTheDocument();
    });

    // Three downloads fired
    expect(clickSpy).toHaveBeenCalledTimes(3);
    // Three blobs created and revoked
    expect(createObjectURLSpy).toHaveBeenCalledTimes(3);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(3);
    // Screenshot helper was called on the target element
    expect(html2canvas).toHaveBeenCalledWith(
      fakeTarget,
      expect.objectContaining({ backgroundColor: '#ffffff' }),
    );
    // Success message reflects the scenario number
    expect(screen.getByText(/7_payload\.json/)).toBeInTheDocument();
    expect(screen.getByText(/7_response\.json/)).toBeInTheDocument();
    expect(screen.getByText(/7\.png/)).toBeInTheDocument();
  });

  it('skips the screenshot step when no ref target is provided', async () => {
    const user = userEvent.setup();
    render(
      <CapturePanel
        payload={{ name: 'nithya' }}
        response={{ matchResult: 'NEW_DEVICE' }}
        screenshotTargetRef={{ current: null }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Download captures/i }));

    await waitFor(() => {
      expect(screen.getByTestId('capture-success')).toBeInTheDocument();
    });
    // Only payload + response downloaded (2 anchor clicks), no screenshot
    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(html2canvas).not.toHaveBeenCalled();
  });

  it('surfaces errors from html2canvas without breaking the panel', async () => {
    const user = userEvent.setup();
    html2canvas.mockRejectedValueOnce(new Error('canvas rendering exploded'));

    render(
      <CapturePanel
        payload={{ name: 'nithya' }}
        response={{ matchResult: 'NEW_DEVICE' }}
        screenshotTargetRef={{ current: document.createElement('div') }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Download captures/i }));

    await waitFor(() => {
      expect(screen.getByText('canvas rendering exploded')).toBeInTheDocument();
    });
  });
});
