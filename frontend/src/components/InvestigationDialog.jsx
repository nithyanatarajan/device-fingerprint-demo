import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { getDeviceInvestigation } from '../services/api';

const CLASSIFICATION_COLOR = {
  SAME_DEVICE: 'success',
  DRIFT_DETECTED: 'warning',
  NEW_DEVICE: 'info',
};

// Pretty-print a raw signal value (string, number, boolean, null) for the
// comparison table cells. Booleans become true/false; null becomes —.
function formatSignalValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function MatchExplanationPanel({ explanation }) {
  // Pre-compute the contributors / lost-confidence partitioning so the JSX
  // stays declarative.
  const { matched, lost, totalMatched, signalCount } = useMemo(() => {
    const enabled = explanation.contributions.filter((c) => c.enabled && c.weight > 0);
    const matchedSorted = enabled
      .filter((c) => c.similarityScore > 0)
      .slice()
      .sort((a, b) => b.weightedContribution - a.weightedContribution);
    const lostSorted = enabled
      .filter((c) => c.similarityScore < 1 && c.latestValue !== null && c.previousValue !== null)
      .slice()
      .sort((a, b) => (1 - a.similarityScore) * b.weight - (1 - b.similarityScore) * a.weight);
    const total = matchedSorted.reduce((sum, c) => sum + c.weightedContribution, 0);
    return {
      matched: matchedSorted,
      lost: lostSorted,
      totalMatched: total,
      signalCount: enabled.length,
    };
  }, [explanation]);

  return (
    <Paper sx={{ p: 2, mb: 3 }} data-testid="match-explanation-panel">
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontFamily: 'monospace' }}>
          {explanation.compositeScore.toFixed(1)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          / 100
        </Typography>
        <Chip
          label={explanation.classification}
          color={CLASSIFICATION_COLOR[explanation.classification] || 'default'}
        />
        <Typography variant="caption" color="text.secondary">
          thresholds: same-device ≥ {explanation.sameDeviceThreshold} • drift ≥{' '}
          {explanation.driftThreshold}
        </Typography>
      </Stack>

      {matched.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Top contributors ({totalMatched.toFixed(1)}% of the composite)
          </Typography>
          <Stack spacing={0.5}>
            {matched.slice(0, 5).map((c) => (
              <Typography key={c.signalName} variant="body2">
                <strong>{c.signalName}</strong> matched (weight {c.weight}) → contributed{' '}
                <Box component="span" sx={{ color: 'success.main', fontWeight: 700 }}>
                  +{c.weightedContribution.toFixed(1)}%
                </Box>
              </Typography>
            ))}
          </Stack>
        </Box>
      )}

      {lost.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Lost confidence ({lost.length} signal(s) changed)
          </Typography>
          <Stack spacing={0.5}>
            {lost.slice(0, 5).map((c) => {
              const totalEnabledWeight = explanation.contributions
                .filter((x) => x.enabled && x.weight > 0)
                .reduce((sum, x) => sum + x.weight, 0);
              const maxPotential =
                totalEnabledWeight > 0 ? (c.weight / totalEnabledWeight) * 100 : 0;
              const lostPoints = maxPotential - c.weightedContribution;
              return (
                <Typography key={c.signalName} variant="body2">
                  <strong>{c.signalName}</strong> changed{' '}
                  <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    {formatSignalValue(c.previousValue)} → {formatSignalValue(c.latestValue)}
                  </Box>{' '}
                  (lost{' '}
                  <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>
                    -{lostPoints.toFixed(1)}%
                  </Box>
                  )
                </Typography>
              );
            })}
          </Stack>
        </Box>
      )}

      <Typography variant="caption" color="text.secondary">
        {matched.length} of {signalCount} enabled signals matched.
      </Typography>
    </Paper>
  );
}

function SignalComparisonTable({ contributions }) {
  return (
    <TableContainer
      component={Paper}
      sx={{ mb: 3, maxHeight: 360 }}
      data-testid="signal-comparison-table"
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Signal</TableCell>
            <TableCell align="right">Weight</TableCell>
            <TableCell>Previous visit</TableCell>
            <TableCell>Latest visit</TableCell>
            <TableCell align="right">Match</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {contributions.map((c) => {
            const matched = c.similarityScore >= 1;
            const partial = c.similarityScore > 0 && c.similarityScore < 1;
            const cellBg = !c.enabled
              ? 'transparent'
              : matched
                ? '#e8f5e9'
                : partial
                  ? '#fff8e1'
                  : '#ffebee';
            return (
              <TableRow
                key={c.signalName}
                sx={{ opacity: c.enabled ? 1 : 0.5 }}
                data-testid={`signal-row-${c.signalName}`}
                data-similarity={c.similarityScore}
              >
                <TableCell sx={{ fontFamily: 'monospace' }}>
                  {c.signalName}
                  {!c.enabled && (
                    <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                      (disabled)
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">{c.weight}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', backgroundColor: cellBg }}>
                  {formatSignalValue(c.previousValue)}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', backgroundColor: cellBg }}>
                  {formatSignalValue(c.latestValue)}
                </TableCell>
                <TableCell align="right">
                  {c.similarityScore >= 1
                    ? '✓'
                    : c.similarityScore > 0
                      ? `${(c.similarityScore * 100).toFixed(0)}%`
                      : '✗'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function VisitTimeline({ visits }) {
  return (
    <Box data-testid="visit-timeline">
      <Typography variant="subtitle2" gutterBottom>
        Visit history ({visits.length} fingerprint(s))
      </Typography>
      <Stack spacing={1}>
        {visits.map((visit, idx) => (
          <Paper key={visit.fingerprintId} sx={{ p: 1.5 }} variant="outlined">
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Chip
                size="small"
                label={idx === 0 ? 'latest' : `visit ${visits.length - idx}`}
                color={idx === 0 ? 'primary' : 'default'}
                variant={idx === 0 ? 'filled' : 'outlined'}
              />
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                {visit.collectedAt}
              </Typography>
              {visit.publicIp && (
                <Typography variant="caption" color="text.secondary">
                  ip: {visit.publicIp}
                </Typography>
              )}
              {visit.machineSignature && (
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  sig: {visit.machineSignature.substring(0, 16)}
                </Typography>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

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
            {data.matchExplanation ? (
              <>
                <MatchExplanationPanel explanation={data.matchExplanation} />
                <SignalComparisonTable contributions={data.matchExplanation.contributions} />
              </>
            ) : (
              <Alert severity="info" sx={{ mb: 3 }}>
                This device has only one fingerprint on record. There&apos;s nothing to compare yet
                — the next visit from this device will produce a match explanation here.
              </Alert>
            )}
            <VisitTimeline visits={data.visits} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
