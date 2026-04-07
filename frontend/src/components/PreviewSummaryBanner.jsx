import Alert from '@mui/material/Alert';

export default function PreviewSummaryBanner({ summary }) {
  if (!summary || !summary.affectedDevices) {
    return null;
  }
  const { affectedDevices, promotedCount, demotedCount } = summary;
  return (
    <Alert severity="info" sx={{ mb: 2 }} data-testid="preview-summary-banner">
      This change affects {affectedDevices} device(s). {promotedCount} promoted, {demotedCount}{' '}
      demoted.
    </Alert>
  );
}
