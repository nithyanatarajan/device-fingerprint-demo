import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { getScoringConfig, resetScoringConfig, updateScoringConfig } from '../services/api';

export default function ThresholdSliders({ onChange }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getScoringConfig()
      .then((data) => {
        setConfig(data);
        if (onChange) onChange(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSameDevice = (value) => {
    // sameDeviceThreshold must be >= driftThreshold
    const driftThreshold = Math.min(config.driftThreshold, value);
    const next = { sameDeviceThreshold: value, driftThreshold };
    setConfig(next);
    if (onChange) onChange(next);
  };

  const updateDrift = (value) => {
    // driftThreshold must be <= sameDeviceThreshold
    const sameDeviceThreshold = Math.max(config.sameDeviceThreshold, value);
    const next = { sameDeviceThreshold, driftThreshold: value };
    setConfig(next);
    if (onChange) onChange(next);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateScoringConfig(config);
      setConfig(saved);
      if (onChange) onChange(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Same loader-aware reset pattern as WeightSliders — never toggles the
  // global loading flag, so the sliders stay mounted while resetting.
  const handleReset = async () => {
    setResetting(true);
    setError(null);
    try {
      const fresh = await resetScoringConfig();
      setConfig(fresh);
      if (onChange) onChange(fresh);
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <CircularProgress size={24} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!config) return null;

  return (
    <Box>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 200 }}>
            <Typography variant="body2">Same-device threshold</Typography>
          </Box>
          <Box sx={{ width: 50 }}>
            <Typography variant="body2" color="text.secondary">
              {config.sameDeviceThreshold}
            </Typography>
          </Box>
          <Slider
            value={config.sameDeviceThreshold}
            onChange={(_, value) => updateSameDevice(value)}
            min={0}
            max={100}
            step={1}
            aria-label="same-device threshold"
            sx={{ flexGrow: 1 }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 200 }}>
            <Typography variant="body2">Drift threshold</Typography>
          </Box>
          <Box sx={{ width: 50 }}>
            <Typography variant="body2" color="text.secondary">
              {config.driftThreshold}
            </Typography>
          </Box>
          <Slider
            value={config.driftThreshold}
            onChange={(_, value) => updateDrift(value)}
            min={0}
            max={100}
            step={1}
            aria-label="drift threshold"
            sx={{ flexGrow: 1 }}
          />
        </Box>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={handleReset} disabled={saving || resetting}>
          {resetting ? <CircularProgress size={20} /> : 'Reset to defaults'}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || resetting}>
          {saving ? <CircularProgress size={20} /> : 'Save thresholds'}
        </Button>
      </Stack>
    </Box>
  );
}
