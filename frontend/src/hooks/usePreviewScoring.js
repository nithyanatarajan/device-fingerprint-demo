import { useEffect, useRef, useState } from 'react';
import { previewScoring } from '../services/api';

const DEBOUNCE_MS = 300;

/**
 * Debounced live preview hook.
 *
 * Whenever weights / sameDeviceThreshold / driftThreshold change, schedules a
 * POST /api/scoring/preview after DEBOUNCE_MS. Cancels pending timers on
 * unmount and ignores stale responses.
 */
export default function usePreviewScoring({ weights, sameDeviceThreshold, driftThreshold }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      !weights ||
      Object.keys(weights).length === 0 ||
      sameDeviceThreshold == null ||
      driftThreshold == null
    ) {
      return undefined;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      const myId = ++requestIdRef.current;
      try {
        const result = await previewScoring({ weights, sameDeviceThreshold, driftThreshold });
        if (mountedRef.current && myId === requestIdRef.current) {
          setPreview(result);
          setError(null);
        }
      } catch (err) {
        if (mountedRef.current && myId === requestIdRef.current) {
          setError(err.message);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [weights, sameDeviceThreshold, driftThreshold]);

  return { preview, error };
}
