import { useMemo, useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Tuning Console
      </Typography>

      {/* Sticky Live Preview banner — always visible while you scroll the
          sliders. This is the headline feedback channel for the Ripple
          Effect; the device rows in Users & Devices are the secondary one. */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar - 1,
          backgroundColor: 'background.default',
          pt: 1,
          pb: 2,
        }}
      >
        <PreviewSummaryBanner summary={preview?.summary} />
      </Box>

      {/* Two-column layout: sliders on the left, Users & Devices on the
          right, so dragging a slider produces visible movement next to it
          rather than buried below. Stacks vertically below md. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Stack spacing={3}>
          <Section title="Signal Weights">
            <WeightSliders onChange={setWeights} />
          </Section>
          <Section title="Thresholds">
            <ThresholdSliders onChange={setConfig} />
          </Section>
          <Accordion defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Demo Data</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <AdminSeedForm onChanged={bumpRefresh} />
            </AccordionDetails>
          </Accordion>
        </Stack>

        <Box sx={{ position: { md: 'sticky' }, top: { md: 96 } }}>
          <Section title="Users & Devices">
            <UserDevicesList refreshKey={userRefreshKey} previewByDeviceId={previewByDeviceId} />
          </Section>
        </Box>
      </Box>
    </Container>
  );
}
