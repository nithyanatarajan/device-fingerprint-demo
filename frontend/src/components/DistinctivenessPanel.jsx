import { useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { getSignalDistinctiveness } from '../services/api';

/**
 * Per-signal distinctiveness for the current fingerprint, measured against the live fingerprint
 * database. Two equivalent views of the same data:
 *
 * - `counts`: "K of N" — how many stored fingerprints share this visitor's value, out of the
 *   total population. The raw measurement.
 * - `ratio`: `100 * K / N` rendered as a uniqueness percentage, where 100% means "shared with
 *   everyone" and numbers close to 1/N mean "unique to you". Easier to skim across rows.
 *
 * The panel is deliberately honest about its limitations: it shows the population size (N) up
 * front and captions the data with a reminder that the numbers only become meaningful as N grows.
 * With N=1 every signal is trivially 100% distinctive, which is not a bug — it is the truth
 * about what this database actually knows.
 */
export default function DistinctivenessPanel({ fingerprintId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('counts');

  useEffect(() => {
    if (!fingerprintId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSignalDistinctiveness(fingerprintId)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fingerprintId]);

  if (!fingerprintId) {
    return null;
  }

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Loading distinctiveness…
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Could not load signal distinctiveness: {error}
      </Alert>
    );
  }

  if (!data) return null;

  const total = data.totalFingerprints;
  const fullMatches = data.fullFingerprintMatchCount;
  const fullIsUnique = fullMatches <= 1;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }} data-testid="distinctiveness-panel">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h6" gutterBottom>
            Signal distinctiveness
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {fullIsUnique
              ? `Your combined 15-signal fingerprint is unique among ${total} stored fingerprint${total === 1 ? '' : 's'}.`
              : `Your combined 15-signal fingerprint matches ${fullMatches} of ${total} stored fingerprints.`}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Measured against this database only — not a reference population. Numbers become more
            meaningful as the sample grows.
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, next) => {
            if (next !== null) setViewMode(next);
          }}
          aria-label="distinctiveness view mode"
        >
          <ToggleButton value="counts" aria-label="collision counts">
            Counts
          </ToggleButton>
          <ToggleButton value="ratio" aria-label="uniqueness ratio">
            Ratio
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Signal</TableCell>
            <TableCell>Your value</TableCell>
            <TableCell align="right">
              <Tooltip
                title={
                  viewMode === 'counts'
                    ? 'How many stored fingerprints share your value for this signal, out of the total population (K of N). K = 1 means only you.'
                    : 'Share of the population that has your value (K / N × 100). 100% means "shared with everyone"; low numbers mean distinctive.'
                }
              >
                <span>{viewMode === 'counts' ? 'Shared with' : 'Share of pop.'}</span>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Distinct values stored across the whole database for this signal.">
                <span>Distinct values</span>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.signals.map((entry) => (
            <TableRow key={entry.signalName}>
              <TableCell>{entry.signalName}</TableCell>
              <TableCell
                sx={{
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {entry.value === null || entry.value === undefined ? (
                  <em>null</em>
                ) : (
                  String(entry.value)
                )}
              </TableCell>
              <TableCell align="right">
                {viewMode === 'counts'
                  ? `${entry.matchCount} of ${total}`
                  : formatRatio(entry.matchCount, total)}
              </TableCell>
              <TableCell align="right">{entry.distinctValues}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

function formatRatio(matchCount, total) {
  if (!total) return '—';
  const pct = (100 * matchCount) / total;
  // One decimal place below 10%, whole number otherwise — keeps the common case
  // (small populations with coarse buckets) readable while still distinguishing
  // 0.1% from 1% once the database grows.
  const formatted = pct >= 10 ? pct.toFixed(0) : pct.toFixed(1);
  return `${formatted}%`;
}
