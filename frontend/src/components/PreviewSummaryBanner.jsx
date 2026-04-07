import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

export default function PreviewSummaryBanner({ summary }) {
  const affected = summary?.affectedDevices ?? 0;

  if (!summary) {
    return (
      <Alert severity="info" data-testid="preview-summary-banner" variant="outlined">
        <AlertTitle>Live Preview</AlertTitle>
        Drag any weight or threshold slider. The impact on existing devices will appear here and
        highlight rows in Users &amp; Devices.
      </Alert>
    );
  }

  if (affected === 0) {
    return (
      <Alert severity="success" data-testid="preview-summary-banner" variant="outlined">
        <AlertTitle>Live Preview — no impact</AlertTitle>
        Your proposed config matches the current config for all {summary.totalDevices ?? 0}{' '}
        device(s) across {summary.totalUsers ?? 0} user(s). Drag a slider further to flip a
        classification.
      </Alert>
    );
  }

  return (
    <Alert severity="warning" data-testid="preview-summary-banner" variant="filled">
      <AlertTitle>
        Live Preview — {affected} device(s) affected{' '}
        {summary.promotedCount > 0 && <>• {summary.promotedCount} promoted</>}{' '}
        {summary.demotedCount > 0 && <>• {summary.demotedCount} demoted</>}
      </AlertTitle>
      {summary.totalUsers} user(s), {summary.totalDevices} device(s), {summary.totalFingerprints}{' '}
      fingerprint(s) evaluated. Highlighted rows show before → after.
    </Alert>
  );
}
