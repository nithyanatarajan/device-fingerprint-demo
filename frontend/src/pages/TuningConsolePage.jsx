import { useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import WeightSliders from '../components/WeightSliders';
import ThresholdSliders from '../components/ThresholdSliders';
import UserDevicesList from '../components/UserDevicesList';
import AdminSeedForm from '../components/AdminSeedForm';

function Section({ title, children }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

export default function TuningConsolePage() {
  const [userRefreshKey, setUserRefreshKey] = useState(0);
  const bumpRefresh = () => setUserRefreshKey((k) => k + 1);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Tuning Console
      </Typography>
      <Stack spacing={3}>
        <Section title="Demo Data">
          <AdminSeedForm onChanged={bumpRefresh} />
        </Section>
        <Section title="Signal Weights">
          <WeightSliders />
        </Section>
        <Section title="Thresholds">
          <ThresholdSliders />
        </Section>
        <Section title="Users & Devices">
          <UserDevicesList refreshKey={userRefreshKey} />
        </Section>
        <Section title="Live Preview Summary" />
      </Stack>
    </Container>
  );
}
