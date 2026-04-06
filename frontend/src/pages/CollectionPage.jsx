import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SignalBreakdown from '../components/SignalBreakdown';
import { collectFingerprint } from '../services/api';
import { collectSignals } from '../services/fingerprint';

const MATCH_COLORS = {
  SAME_DEVICE: 'success',
  DRIFT_DETECTED: 'warning',
  NEW_DEVICE: 'info',
};

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

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const collected = await collectSignals();
      setSignals(collected);
      const response = await collectFingerprint({ name: name.trim(), ...collected });
      setResult({ ...response, name: name.trim() });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Device Identification
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          fullWidth
        />
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !name.trim()}>
          {loading ? <CircularProgress size={20} /> : 'Identify'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Chip
              label={result.matchResult}
              color={MATCH_COLORS[result.matchResult] || 'default'}
            />
            <Typography>{buildMessage(result)}</Typography>
          </Box>

          {result.changedSignals && result.changedSignals.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Changed signals detected: {result.changedSignals.join(', ')}
            </Alert>
          )}
        </Box>
      )}

      {signals && <SignalBreakdown signals={signals} changedSignals={result?.changedSignals} />}
    </Box>
  );
}
