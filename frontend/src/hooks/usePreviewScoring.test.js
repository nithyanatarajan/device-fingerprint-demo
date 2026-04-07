import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import usePreviewScoring from './usePreviewScoring';

vi.mock('../services/api', () => ({
  previewScoring: vi.fn(),
}));

import { previewScoring } from '../services/api';

beforeEach(() => {
  vi.useFakeTimers();
  previewScoring.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePreviewScoring', () => {
  it('does not call previewScoring when weights empty', async () => {
    renderHook(() =>
      usePreviewScoring({ weights: {}, sameDeviceThreshold: 80, driftThreshold: 50 }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(previewScoring).not.toHaveBeenCalled();
  });

  it('debounces calls and only fires after 300ms', async () => {
    previewScoring.mockResolvedValue({
      users: [],
      summary: { affectedDevices: 0 },
    });

    const { rerender } = renderHook(
      ({ weights }) => usePreviewScoring({ weights, sameDeviceThreshold: 80, driftThreshold: 50 }),
      {
        initialProps: { weights: { canvas_hash: { weight: 90, enabled: true } } },
      },
    );

    // Before 300ms passes, no call
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(previewScoring).not.toHaveBeenCalled();

    // Re-render with new weights — resets the timer
    rerender({ weights: { canvas_hash: { weight: 50, enabled: true } } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(previewScoring).not.toHaveBeenCalled();

    // Now elapse remaining
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(previewScoring).toHaveBeenCalledTimes(1);
    expect(previewScoring).toHaveBeenCalledWith({
      weights: { canvas_hash: { weight: 50, enabled: true } },
      sameDeviceThreshold: 80,
      driftThreshold: 50,
    });
  });

  it('exposes preview result after fetch resolves', async () => {
    const result = { users: [], summary: { affectedDevices: 3 } };
    previewScoring.mockResolvedValue(result);

    const { result: hookResult } = renderHook(() =>
      usePreviewScoring({
        weights: { canvas_hash: { weight: 90, enabled: true } },
        sameDeviceThreshold: 80,
        driftThreshold: 50,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(hookResult.current.preview).toEqual(result);
  });

  it('cancels pending timer on unmount', async () => {
    previewScoring.mockResolvedValue({ users: [], summary: {} });
    const { unmount } = renderHook(() =>
      usePreviewScoring({
        weights: { canvas_hash: { weight: 90, enabled: true } },
        sameDeviceThreshold: 80,
        driftThreshold: 50,
      }),
    );

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(previewScoring).not.toHaveBeenCalled();
  });

  it('captures error from API failure', async () => {
    previewScoring.mockRejectedValue(new Error('preview boom'));
    const { result } = renderHook(() =>
      usePreviewScoring({
        weights: { canvas_hash: { weight: 90, enabled: true } },
        sameDeviceThreshold: 80,
        driftThreshold: 50,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(result.current.error).toBe('preview boom');
  });
});
