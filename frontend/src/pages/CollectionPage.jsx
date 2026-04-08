import { useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SignalBreakdown from '../components/SignalBreakdown';
import SameMachinePanel from '../components/SameMachinePanel';
import CapturePanel from '../components/CapturePanel';
import { collectFingerprint } from '../services/api';
import { collectSignals, FingerprintBlockedError } from '../services/fingerprint';

const MATCH_COLORS = {
  SAME_DEVICE: 'success',
  DRIFT_DETECTED: 'warning',
  NEW_DEVICE: 'info',
};

const MACHINE_MATCH_COLORS = {
  SAME_MACHINE: 'success',
  MATCHING_HARDWARE: 'warning',
  NO_MACHINE_MATCH: 'default',
};

function machineMatchVerdict(machineMatch) {
  if (!machineMatch) return 'NO_MACHINE_MATCH';
  if (machineMatch.strongMatches && machineMatch.strongMatches.length > 0) {
    return 'SAME_MACHINE';
  }
  if (machineMatch.possibleMatches && machineMatch.possibleMatches.length > 0) {
    return 'MATCHING_HARDWARE';
  }
  return 'NO_MACHINE_MATCH';
}

function buildMessage(result) {
  const { matchResult, deviceLabel, score } = result;
  const name = result.name || result.userId;

  if (matchResult === 'SAME_DEVICE') {
    return `Welcome back ${name}, we recognized your ${deviceLabel} (${score}%)`;
  }
  if (matchResult === 'DRIFT_DETECTED') {
    return `Welcome back ${name}, your ${deviceLabel} looks a bit different (${score}%)`;
  }
  return `New device registered for ${name}: ${deviceLabel}`;
}

export default function CollectionPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [signals, setSignals] = useState(null);
  const [error, setError] = useState(null);
  // Raw request payload and response, captured at the moment the collect call
  // is made. Only used by CapturePanel when ?capture=1 is set; normal visitors
  // never see either field.
  const [lastRequestPayload, setLastRequestPayload] = useState(null);
  const [lastResponsePayload, setLastResponsePayload] = useState(null);
  const resultContainerRef = useRef(null);

  // Capture mode is opt-in via the ?capture=1 query param. This check runs
  // once at mount time; toggling requires a URL change + reload.
  const captureMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('capture') === '1';
  }, []);

  const handleSubmit = async (event) => {
    // Allow this to be wired both as a button onClick and a form onSubmit;
    // when called from a form, prevent the default page reload.
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setLastRequestPayload(null);
    setLastResponsePayload(null);

    try {
      const collected = await collectSignals();
      setSignals(collected);
      const requestBody = { name: name.trim(), ...collected };
      const response = await collectFingerprint(requestBody);
      setResult({ ...response, name: name.trim() });
      setLastRequestPayload(requestBody);
      setLastResponsePayload(response);
    } catch (err) {
      if (err instanceof FingerprintBlockedError) {
        setError(
          'Device fingerprinting could not run. A privacy extension (such as uBlock Origin or Brave Shields) may be blocking the FingerprintJS library. Disable it for this site and reload.',
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Device Identification
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          fullWidth
          autoFocus
        />
        <Button type="submit" variant="contained" disabled={loading || !name.trim()}>
          {loading ? <CircularProgress size={20} /> : 'Identify'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Result container — wrapped in a ref so CapturePanel's html2canvas
          can screenshot just the result area (chips + welcome message +
          Same Machine panel) without pulling in the signal breakdown or
          the form above. */}
      {result && (
        <Box ref={resultContainerRef}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Chip
                label={result.matchResult}
                color={MATCH_COLORS[result.matchResult] || 'default'}
              />
              <Chip
                label={machineMatchVerdict(result.machineMatch)}
                color={MACHINE_MATCH_COLORS[machineMatchVerdict(result.machineMatch)] || 'default'}
                variant="outlined"
              />
              <Typography>{buildMessage(result)}</Typography>
            </Box>

            {result.changedSignals && result.changedSignals.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Changed signals detected: {result.changedSignals.join(', ')}
              </Alert>
            )}
          </Box>

          <SameMachinePanel
            strongMatches={result?.machineMatch?.strongMatches}
            possibleMatches={result?.machineMatch?.possibleMatches}
          />
        </Box>
      )}

      {signals && <SignalBreakdown signals={signals} changedSignals={result?.changedSignals} />}

      {captureMode && (
        <CapturePanel
          payload={lastRequestPayload}
          response={lastResponsePayload}
          screenshotTargetRef={resultContainerRef}
        />
      )}
    </Box>
  );
}
