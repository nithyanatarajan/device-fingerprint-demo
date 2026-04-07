import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Chip from '@mui/material/Chip';
import InvestigationDialog from './InvestigationDialog';
import { getUsers, getUserDevices } from '../services/api';

const TRANSITION_BG = {
  PROMOTED: '#e8f5e9',
  DEMOTED: '#ffebee',
  UNCHANGED: 'transparent',
};

function formatScore(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toFixed(1);
}

function ScoreDisplay({ previewDevice }) {
  if (!previewDevice) {
    return (
      <Typography variant="caption" color="text.disabled" data-testid="device-score">
        score: —
      </Typography>
    );
  }

  if (previewDevice.fingerprintCount != null && previewDevice.fingerprintCount < 2) {
    return (
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ fontStyle: 'italic' }}
        data-testid="device-score"
      >
        single visit — no history to score yet
      </Typography>
    );
  }

  const { currentScore, proposedScore, transition } = previewDevice;
  const moved = Math.abs((proposedScore ?? 0) - (currentScore ?? 0)) >= 0.05;

  if (!moved) {
    return (
      <Typography variant="caption" sx={{ fontFamily: 'monospace' }} data-testid="device-score">
        score: <strong>{formatScore(currentScore)}</strong>
      </Typography>
    );
  }

  const color =
    transition === 'PROMOTED'
      ? 'success.main'
      : transition === 'DEMOTED'
        ? 'error.main'
        : 'warning.main';

  return (
    <Typography variant="caption" sx={{ fontFamily: 'monospace' }} data-testid="device-score">
      score:{' '}
      <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>
        {formatScore(currentScore)}
      </span>{' '}
      → <strong style={{ color: 'inherit' }}>{formatScore(proposedScore)}</strong>{' '}
      <Box component="span" sx={{ color, fontWeight: 700 }}>
        ({proposedScore > currentScore ? '+' : ''}
        {(proposedScore - currentScore).toFixed(1)})
      </Box>
    </Typography>
  );
}

function DeviceRow({ device, previewDevice, onInvestigate }) {
  const isSingleFingerprint =
    previewDevice?.fingerprintCount != null && previewDevice.fingerprintCount < 2;
  const transition = isSingleFingerprint ? 'UNCHANGED' : previewDevice?.transition || 'UNCHANGED';

  // Tooltip message: tells the user what clicking the row will do, and warns
  // when there's no comparison available (single-visit device).
  const tooltipText = isSingleFingerprint
    ? 'Open investigation — single visit, no comparison yet'
    : 'Open investigation — see why this device matched';

  return (
    <Box
      data-testid={`device-row-${device.id}`}
      data-transition={transition}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: TRANSITION_BG[transition],
      }}
    >
      {/* Click anywhere on the row to open the Phase 4 investigation modal.
          Single-fingerprint devices still open the modal — it gracefully shows
          the lone visit and explains why there's no comparison yet. */}
      <Tooltip title={tooltipText} placement="top-start" enterDelay={400}>
        <Box
          component="button"
          type="button"
          onClick={() => onInvestigate(device.id, device.label)}
          data-testid={`device-row-button-${device.id}`}
          sx={{
            width: '100%',
            textAlign: 'left',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            py: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, flexShrink: 0 }}>
            {device.label}
          </Typography>
          <ScoreDisplay previewDevice={previewDevice} />
          {!isSingleFingerprint && previewDevice && previewDevice.transition !== 'UNCHANGED' && (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', ml: 'auto' }}>
              <Chip size="small" label={previewDevice.currentClassification} variant="outlined" />
              <Typography variant="caption">→</Typography>
              <Chip
                size="small"
                label={previewDevice.proposedClassification}
                color={previewDevice.transition === 'PROMOTED' ? 'success' : 'error'}
              />
            </Box>
          )}
        </Box>
      </Tooltip>
    </Box>
  );
}

export default function UserDevicesList({ refreshKey = 0, previewByDeviceId = {} }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collapsedUserIds, setCollapsedUserIds] = useState(() => new Set());
  const [devicesByUser, setDevicesByUser] = useState({});
  const [deviceError, setDeviceError] = useState({});
  // Investigation modal state — which (userId, deviceId, deviceLabel) to show.
  // null when the modal is closed.
  const [investigationTarget, setInvestigationTarget] = useState(null);

  const openInvestigation = (userId, deviceId, deviceLabel) => {
    setInvestigationTarget({ userId, deviceId, deviceLabel });
  };
  const closeInvestigation = () => setInvestigationTarget(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getUsers()
      .then(async (loadedUsers) => {
        if (cancelled) return;
        setUsers(loadedUsers);

        // Eagerly fetch devices for every user so the list is fully expanded
        // when the page loads. This makes the Ripple Effect highlights
        // visible without requiring a click.
        const results = await Promise.allSettled(
          loadedUsers.map((u) => getUserDevices(u.id).then((devices) => [u.id, devices])),
        );
        if (cancelled) return;

        const nextDevices = {};
        const nextErrors = {};
        results.forEach((result, idx) => {
          const userId = loadedUsers[idx].id;
          if (result.status === 'fulfilled') {
            nextDevices[userId] = result.value[1];
          } else {
            nextErrors[userId] = result.reason?.message || 'Failed to load devices';
          }
        });
        setDevicesByUser(nextDevices);
        setDeviceError(nextErrors);
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
  }, [refreshKey]);

  const toggle = (userId) => {
    setCollapsedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  if (loading) return <CircularProgress size={24} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (users.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No users yet. Open the Demo Data tab to seed some.
      </Typography>
    );
  }

  return (
    <>
      <List dense>
        {users.map((user) => {
          const isOpen = !collapsedUserIds.has(user.id);
          return (
            <Box key={user.id} data-testid={`user-section-${user.name}`}>
              <ListItem disablePadding>
                <ListItemButton onClick={() => toggle(user.id)}>
                  <ListItemText primary={user.name} secondary={`${user.deviceCount} device(s)`} />
                  {isOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 2, pr: 2, pb: 1 }}>
                  {deviceError[user.id] && <Alert severity="error">{deviceError[user.id]}</Alert>}
                  {devicesByUser[user.id] &&
                    devicesByUser[user.id].map((device) => (
                      <DeviceRow
                        key={device.id}
                        device={device}
                        previewDevice={previewByDeviceId[device.id]}
                        onInvestigate={(deviceId, deviceLabel) =>
                          openInvestigation(user.id, deviceId, deviceLabel)
                        }
                      />
                    ))}
                  {devicesByUser[user.id] && devicesByUser[user.id].length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      No devices.
                    </Typography>
                  )}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </List>
      <InvestigationDialog
        open={investigationTarget !== null}
        userId={investigationTarget?.userId}
        deviceId={investigationTarget?.deviceId}
        deviceLabel={investigationTarget?.deviceLabel}
        onClose={closeInvestigation}
      />
    </>
  );
}
