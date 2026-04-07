import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { getScoringWeights, updateScoringWeights } from '../services/api';

export default function WeightSliders({ onChange }) {
  const [weights, setWeights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    return getScoringWeights()
      .then((data) => {
        setWeights(data);
        if (onChange) onChange(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateWeight = (signal, value) => {
    const next = { ...weights, [signal]: { ...weights[signal], weight: value } };
    setWeights(next);
    if (onChange) onChange(next);
  };

  const updateEnabled = (signal, enabled) => {
    const next = { ...weights, [signal]: { ...weights[signal], enabled } };
    setWeights(next);
    if (onChange) onChange(next);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateScoringWeights(weights);
      setWeights(saved);
      if (onChange) onChange(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <CircularProgress size={24} />;
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  if (!weights) {
    return null;
  }

  const signals = Object.keys(weights);

  return (
    <Box>
      <Stack spacing={2}>
        {signals.map((signal) => {
          const entry = weights[signal];
          return (
            <Box key={signal} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 200 }}>
                <Typography variant="body2">{signal}</Typography>
              </Box>
              <Box sx={{ width: 50 }}>
                <Typography variant="body2" color="text.secondary">
                  {entry.weight}
                </Typography>
              </Box>
              <Slider
                value={entry.weight}
                onChange={(_, value) => updateWeight(signal, value)}
                min={0}
                max={100}
                step={1}
                disabled={!entry.enabled}
                aria-label={`${signal} weight`}
                sx={{ flexGrow: 1 }}
              />
              <Switch
                checked={entry.enabled}
                onChange={(e) => updateEnabled(signal, e.target.checked)}
                data-testid={`switch-${signal}`}
              />
            </Box>
          );
        })}
      </Stack>
      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={load} disabled={saving}>
          Reset to defaults
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Save weights'}
        </Button>
      </Stack>
    </Box>
  );
}
