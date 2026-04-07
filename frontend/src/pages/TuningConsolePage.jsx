import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import WeightSliders from '../components/WeightSliders';

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
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Tuning Console
      </Typography>
      <Stack spacing={3}>
        <Section title="Demo Data" />
        <Section title="Signal Weights">
          <WeightSliders />
        </Section>
        <Section title="Thresholds" />
        <Section title="Users & Devices" />
        <Section title="Live Preview Summary" />
      </Stack>
    </Container>
  );
}
