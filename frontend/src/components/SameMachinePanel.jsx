import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';

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

function MatchList({ matches }) {
  return (
    <List dense>
      {matches.map((match) => (
        <ListItem key={`${match.userId}-${match.deviceId}`} disableGutters>
          <ListItemText
            primary={match.deviceLabel}
            secondary={formatRelativeTime(match.lastSeenAt)}
          />
        </ListItem>
      ))}
    </List>
  );
}

export default function SameMachinePanel({ strongMatches, possibleMatches }) {
  const strong = strongMatches || [];
  const possible = possibleMatches || [];

  if (strong.length === 0 && possible.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      {strong.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Same machine
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Your other sessions on this hardware, on the same network.
          </Typography>
          <MatchList matches={strong} />
        </Paper>
      )}

      {possible.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderColor: 'warning.main', borderLeftWidth: 3 }}>
          <Typography variant="h6" gutterBottom>
            Matching hardware
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Your other sessions with the same hardware, from a different network. Could be the same
            machine on a different Wi-Fi or VPN.
          </Typography>
          <MatchList matches={possible} />
        </Paper>
      )}
    </Stack>
  );
}
