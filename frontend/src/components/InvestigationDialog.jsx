import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { getDeviceInvestigation } from '../services/api';

/**
 * Investigation modal for one device. Opens when the user clicks a device row in the Tuning
 * Console. Fetches /investigation on open, shows a loading state, and renders the read-only
 * payload (visit timeline + match explanation + signal table) inside the dialog body.
 *
 * The dialog is controlled — the parent passes `open`, `userId`, `deviceId`, and `onClose`. The
 * fetch is keyed on (userId, deviceId) so reopening for a different device re-fetches.
 */
export default function InvestigationDialog({ open, userId, deviceId, deviceLabel, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !userId || !deviceId) {
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    getDeviceInvestigation(userId, deviceId)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId, deviceId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      data-testid="investigation-dialog"
    >
      <DialogTitle>
        Investigation
        {deviceLabel && (
          <Typography variant="body2" color="text.secondary">
            {deviceLabel}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress data-testid="investigation-loading" />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && data && (
          <Box data-testid="investigation-content">
            {/* Content sections (match panel, signal table, visit timeline) land in the next
                commit. For now we render a minimal placeholder with the visit count so the
                dialog has visible content and the scaffold tests have something to assert on. */}
            <Typography variant="body2" color="text.secondary">
              {data.visitCount} visit(s) on this device. Detail panels coming next.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
