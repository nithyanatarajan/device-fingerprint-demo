import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';

export function formatRelativeTime(isoString, now = Date.now()) {
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const diffSeconds = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSeconds < 60) {
    return 'just now';
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

export default function SameMachinePanel({ matches }) {
  if (!matches || matches.length === 0) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Same machine
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Other browsers seen on this device and network.
      </Typography>
      <List dense>
        {matches.map((match) => (
          <ListItem key={`${match.userId}-${match.deviceId}`} disableGutters>
            <ListItemText
              primary={`${match.deviceLabel} \u00B7 ${match.userName}`}
              secondary={formatRelativeTime(match.lastSeenAt)}
            />
          </ListItem>
        ))}
      </List>
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Based on device hardware and network. Identical machines on the same network may appear as
          one.
        </Typography>
      </Box>
    </Paper>
  );
}
