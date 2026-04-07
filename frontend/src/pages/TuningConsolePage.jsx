import { useMemo, useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import WeightSliders from '../components/WeightSliders';
import ThresholdSliders from '../components/ThresholdSliders';
import UserDevicesList from '../components/UserDevicesList';
import AdminSeedForm from '../components/AdminSeedForm';
import PreviewSummaryBanner from '../components/PreviewSummaryBanner';
import usePreviewScoring from '../hooks/usePreviewScoring';

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

  const [weights, setWeights] = useState(null);
  const [config, setConfig] = useState(null);

  const { preview } = usePreviewScoring({
    weights,
    sameDeviceThreshold: config?.sameDeviceThreshold,
    driftThreshold: config?.driftThreshold,
  });

  const previewByDeviceId = useMemo(() => {
    if (!preview?.users) return {};
    const map = {};
    preview.users.forEach((u) => {
      u.devices.forEach((d) => {
        map[d.deviceId] = d;
      });
    });
    return map;
  }, [preview]);

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
          <WeightSliders onChange={setWeights} />
        </Section>
        <Section title="Thresholds">
          <ThresholdSliders onChange={setConfig} />
        </Section>
        <Section title="Users & Devices">
          <PreviewSummaryBanner summary={preview?.summary} />
          <UserDevicesList refreshKey={userRefreshKey} previewByDeviceId={previewByDeviceId} />
        </Section>
        <Section title="Live Preview Summary">
          {preview?.summary ? (
            <Typography variant="body2" color="text.secondary">
              {preview.summary.totalUsers} user(s), {preview.summary.totalDevices} device(s),{' '}
              {preview.summary.totalFingerprints} fingerprint(s). Affected:{' '}
              {preview.summary.affectedDevices}.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Adjust a slider to preview impact.
            </Typography>
          )}
        </Section>
      </Stack>
    </Container>
  );
}
