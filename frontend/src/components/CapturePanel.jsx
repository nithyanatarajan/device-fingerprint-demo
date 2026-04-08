import { useState } from 'react';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import html2canvas from 'html2canvas';

// Target directory shown in the helper text. Read from VITE_CAPTURE_DIR so
// the presenter can override it via an env file (frontend/.env, .env.local,
// or the root envrc.sample) without editing code when the captures folder
// gets reorganised. Defaults to the current docs/demo/recordings/ layout.
const CAPTURE_DIR = import.meta.env.VITE_CAPTURE_DIR || 'docs/demo/recordings/';

/**
 * Small delay between consecutive downloads. Safari silently drops download
 * clicks that fire in the same synchronous tick (it dedupes them), so each
 * file needs its own moment in the event loop. 150ms is conservative —
 * Chrome and Firefox don't need it, but the overhead is invisible to the
 * user and it makes re-capture reliable in Safari.
 */
const DOWNLOAD_SPACING_MS = 150;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper: creates a temporary anchor, clicks it, and revokes the URL. This is
 * the cross-browser-reliable way to trigger a file download from a Blob.
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Small fixed panel shown in capture mode (URL query param {@code ?capture=1})
 * after every successful /api/collect call. Dumps the request payload, the
 * response body, and an html2canvas screenshot of the result area to the
 * user's Downloads folder, numbered by the scenario the user types in.
 *
 * The panel is deliberately minimal — it does not try to replace the
 * docs/demo/scenarios.md matrix or the manual review step. It just removes
 * the DevTools copy-paste drudgery from the Phase 2 re-capture pass.
 *
 * Props:
 * - {@code payload}: the request body sent to /api/collect (captured by the
 *   caller at the moment it calls collectFingerprint).
 * - {@code response}: the response body returned from /api/collect.
 * - {@code screenshotTargetRef}: React ref pointing at the DOM node to
 *   screenshot (typically the result container on CollectionPage).
 */
export default function CapturePanel({ payload, response, screenshotTargetRef }) {
  const [scenarioNumber, setScenarioNumber] = useState('1');
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  const hasData = payload && response;

  const handleCapture = async () => {
    setCapturing(true);
    setError(null);
    setLastSaved(null);
    try {
      const n = (scenarioNumber || '1').trim();
      if (!n) {
        throw new Error('scenario number is required');
      }

      downloadBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
        `${n}_payload.json`,
      );
      // Safari dedupes downloads fired in the same synchronous tick. Space
      // the response download into its own tick so all three files land.
      await sleep(DOWNLOAD_SPACING_MS);
      downloadBlob(
        new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' }),
        `${n}_response.json`,
      );

      if (screenshotTargetRef?.current) {
        // Same rationale — space the screenshot download from the response.
        await sleep(DOWNLOAD_SPACING_MS);
        const canvas = await html2canvas(screenshotTargetRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
        });
        await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('failed to render screenshot to PNG'));
              return;
            }
            downloadBlob(blob, `${n}.png`);
            resolve();
          }, 'image/png');
        });
      }

      setLastSaved(n);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        p: 2,
        zIndex: 9999,
        minWidth: 280,
        border: '2px solid',
        borderColor: 'warning.main',
      }}
      data-testid="capture-panel"
    >
      <Typography variant="subtitle2" gutterBottom>
        Capture mode
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Downloads <code>N_payload.json</code>, <code>N_response.json</code>, <code>N.png</code> to
        your Downloads folder. Move them into <code>{CAPTURE_DIR}</code> after.
      </Typography>
      <TextField
        size="small"
        label="Scenario #"
        value={scenarioNumber}
        onChange={(e) => setScenarioNumber(e.target.value)}
        sx={{ mb: 1, width: '100%' }}
        disabled={capturing}
      />
      <Button
        variant="contained"
        size="small"
        onClick={handleCapture}
        disabled={capturing || !hasData}
        fullWidth
      >
        {capturing ? 'Capturing…' : 'Download captures'}
      </Button>
      {!hasData && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
          Run a collect call first.
        </Typography>
      )}
      {lastSaved && !error && (
        <Alert severity="success" sx={{ mt: 1 }} data-testid="capture-success">
          Saved {lastSaved}_payload.json, {lastSaved}_response.json, {lastSaved}.png
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
}
