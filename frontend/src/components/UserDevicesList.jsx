import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Chip from '@mui/material/Chip';
import { getUsers, getUserDevices } from '../services/api';

function formatLastSeen(value) {
  if (!value) return 'never';
  return value;
}

const TRANSITION_BG = {
  PROMOTED: '#e8f5e9',
  DEMOTED: '#ffebee',
  UNCHANGED: 'transparent',
};

function DeviceRow({ device, previewDevice }) {
  const transition = previewDevice?.transition || 'UNCHANGED';
  return (
    <Box
      data-testid={`device-row-${device.id}`}
      data-transition={transition}
      sx={{
        py: 1,
        px: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: TRANSITION_BG[transition],
      }}
    >
      <Typography variant="body2" component="div">
        {device.label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            color: device.machineSignature ? 'text.primary' : 'text.disabled',
          }}
        >
          sig: {device.machineSignature || 'null'}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: device.publicIp ? 'text.primary' : 'text.disabled' }}
        >
          ip: {device.publicIp || 'null'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          last seen: {formatLastSeen(device.lastSeenAt)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          visits: {device.visitCount}
        </Typography>
      </Box>
      {previewDevice && previewDevice.transition !== 'UNCHANGED' && (
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
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
  );
}

export default function UserDevicesList({ refreshKey = 0, previewByDeviceId = {} }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [devicesByUser, setDevicesByUser] = useState({});
  const [deviceLoading, setDeviceLoading] = useState({});
  const [deviceError, setDeviceError] = useState({});

  useEffect(() => {
    setLoading(true);
    getUsers()
      .then((data) => setUsers(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const toggle = async (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    if (devicesByUser[userId]) return;
    setDeviceLoading((prev) => ({ ...prev, [userId]: true }));
    setDeviceError((prev) => ({ ...prev, [userId]: null }));
    try {
      const devices = await getUserDevices(userId);
      setDevicesByUser((prev) => ({ ...prev, [userId]: devices }));
    } catch (err) {
      setDeviceError((prev) => ({ ...prev, [userId]: err.message }));
    } finally {
      setDeviceLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) return <CircularProgress size={24} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (users.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No users yet.
      </Typography>
    );
  }

  return (
    <List dense>
      {users.map((user) => {
        const isOpen = expandedUserId === user.id;
        return (
          <Box key={user.id}>
            <ListItem disablePadding>
              <ListItemButton onClick={() => toggle(user.id)}>
                <ListItemText primary={user.name} secondary={`${user.deviceCount} device(s)`} />
                {isOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Box sx={{ pl: 2, pr: 2, pb: 1 }}>
                {deviceLoading[user.id] && <CircularProgress size={20} />}
                {deviceError[user.id] && <Alert severity="error">{deviceError[user.id]}</Alert>}
                {devicesByUser[user.id] &&
                  devicesByUser[user.id].map((device) => (
                    <DeviceRow
                      key={device.id}
                      device={device}
                      previewDevice={previewByDeviceId[device.id]}
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
  );
}
