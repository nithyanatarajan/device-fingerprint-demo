import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import { seedDemoUser, getSeedSummary, clearSeedData } from '../services/api';

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
  if (machineMatch.strongMatches && machineMatch.strongMatches.length > 0) return 'SAME_MACHINE';
  if (machineMatch.possibleMatches && machineMatch.possibleMatches.length > 0)
    return 'MATCHING_HARDWARE';
  return 'NO_MACHINE_MATCH';
}

const USER_PREFIX = 'demo-user-';
const VALID_SUFFIX = /^[a-z0-9-]+$/;

export default function AdminSeedForm({ onChanged }) {
  const [nameSuffix, setNameSuffix] = useState('alpha');
  const [browser, setBrowser] = useState('chrome');
  const [vpn, setVpn] = useState(false);
  const [incognito, setIncognito] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  const validName = nameSuffix.length > 0 && VALID_SUFFIX.test(nameSuffix);

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      const result = await seedDemoUser({
        userName: USER_PREFIX + nameSuffix,
        browser,
        vpn,
        incognito,
      });
      setLastResult(result);
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const openClearDialog = async () => {
    setError(null);
    try {
      const s = await getSeedSummary();
      setSummary(s);
      setDialogOpen(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirmClear = async () => {
    setClearing(true);
    setError(null);
    try {
      const deleted = await clearSeedData();
      setSnackbar(
        `Cleared: ${deleted.users} user(s), ${deleted.devices} device(s), ${deleted.fingerprints} fingerprint(s)`,
      );
      setDialogOpen(false);
      setLastResult(null);
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setClearing(false);
    }
  };

  // Allow Escape / cancel without leaving dialog state stale
  useEffect(() => {
    if (!dialogOpen) setSummary(null);
  }, [dialogOpen]);

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={2}>
        <TextField
          label="User name"
          value={nameSuffix}
          onChange={(e) => setNameSuffix(e.target.value.trim().toLowerCase())}
          helperText={
            validName
              ? `Will be created as ${USER_PREFIX}${nameSuffix}`
              : 'Lowercase letters, digits, and hyphens only'
          }
          error={!validName}
          size="small"
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">{USER_PREFIX}</InputAdornment>,
            },
          }}
        />
        <FormControl size="small">
          <InputLabel id="browser-label">Browser</InputLabel>
          <Select
            labelId="browser-label"
            label="Browser"
            value={browser}
            onChange={(e) => setBrowser(e.target.value)}
          >
            <MenuItem value="chrome">Chrome</MenuItem>
            <MenuItem value="firefox">Firefox</MenuItem>
            <MenuItem value="safari">Safari</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={vpn}
              onChange={(e) => setVpn(e.target.checked)}
              data-testid="seed-vpn-switch"
            />
          }
          label="VPN"
        />
        <FormControlLabel
          control={
            <Switch
              checked={incognito}
              onChange={(e) => setIncognito(e.target.checked)}
              data-testid="seed-incognito-switch"
            />
          }
          label="Incognito"
        />
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={handleSeed} disabled={seeding || !validName}>
            {seeding ? <CircularProgress size={20} /> : 'Seed'}
          </Button>
          <Button variant="outlined" color="error" onClick={openClearDialog}>
            Clear all demo data
          </Button>
        </Stack>
      </Stack>

      {lastResult && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Last result
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label={lastResult.matchResult}
              color={MATCH_COLORS[lastResult.matchResult] || 'default'}
            />
            <Chip
              label={machineMatchVerdict(lastResult.machineMatch)}
              color={
                MACHINE_MATCH_COLORS[machineMatchVerdict(lastResult.machineMatch)] || 'default'
              }
              variant="outlined"
            />
            {lastResult.deviceLabel && <Chip label={lastResult.deviceLabel} variant="outlined" />}
            {typeof lastResult.score === 'number' && (
              <Chip label={`score: ${lastResult.score}`} variant="outlined" />
            )}
          </Stack>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Clear all demo data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {summary
              ? `This will delete ${summary.users} user(s), ${summary.devices} device(s), and ${summary.fingerprints} fingerprint(s). This action cannot be undone.`
              : 'Loading…'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={clearing}>
            Cancel
          </Button>
          <Button onClick={handleConfirmClear} color="error" disabled={clearing}>
            {clearing ? <CircularProgress size={20} /> : 'Clear'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
}
