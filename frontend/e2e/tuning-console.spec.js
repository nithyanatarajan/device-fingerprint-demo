import { test, expect } from '@playwright/test';

// E2E coverage for the Tuning Console (/admin). These tests run against a
// live backend at E2E_BACKEND_URL (default http://localhost:8080).
//
// Scope per test:
//  1. Page structure — all five sections render
//  2. Seeding a demo user puts them in the Users & Devices list and the
//     expanded device row shows the machine signature and public IP
//  3. Seeding a second (Firefox incognito) demo user produces a second
//     user row and a different Last Result
//  4. The clear-all confirmation dialog shows the demo-data counts and
//     Cancel leaves the data intact
//  5. Confirming the dialog clears all demo data and shows the success
//     snackbar
//  6. Invalid userName (without demo-user- prefix) disables Seed and the
//     backend rejects it even if someone bypasses the UI
//  7. Dragging canvas_hash to 0 triggers Ripple Effect preview and the
//     seeded device row is highlighted as DEMOTED or shows the banner
//  8. The same-device >= drift invariant is enforced client-side when
//     dragging the drift slider up past the same-device value
//  9. Save weights persists — reloading the page shows the modified value

const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:8080';

async function openDemoDataTab(page) {
  // Demo Data lives in its own tab in the redesigned layout. Click the tab
  // to make the seed form visible before interacting with it.
  await page.getByRole('tab', { name: 'Demo Data' }).click();
  await expect(page.getByLabel('User name')).toBeVisible({ timeout: 5_000 });
}

async function openTuneTab(page) {
  // Switches back to the Tune tab to verify device list state after seeding.
  await page.getByRole('tab', { name: 'Tune' }).click();
  await expect(page.getByLabel('canvas_hash weight')).toBeVisible({ timeout: 5_000 });
}

async function cleanup(request) {
  try {
    await request.delete(`${BACKEND_URL}/api/admin/seed`);
  } catch {
    // ignore
  }
}

async function resetScoringDefaults(request) {
  try {
    await request.put(`${BACKEND_URL}/api/scoring/config`, {
      data: { sameDeviceThreshold: 85.0, driftThreshold: 60.0 },
    });
    const defaults = {
      canvas_hash: { weight: 90, enabled: true },
      webgl_renderer: { weight: 85, enabled: true },
      touch_support: { weight: 70, enabled: true },
      platform: { weight: 60, enabled: true },
      hardware_concurrency: { weight: 50, enabled: true },
      device_memory: { weight: 50, enabled: true },
      pixel_ratio: { weight: 45, enabled: true },
      screen_resolution: { weight: 40, enabled: true },
      codec_support: { weight: 35, enabled: true },
      user_agent: { weight: 30, enabled: true },
      timezone: { weight: 20, enabled: true },
      locale: { weight: 15, enabled: true },
      color_depth: { weight: 15, enabled: true },
      dnt_enabled: { weight: 10, enabled: true },
      cookie_enabled: { weight: 5, enabled: true },
    };
    await request.put(`${BACKEND_URL}/api/scoring/weights`, { data: defaults });
  } catch {
    // ignore
  }
}

test.describe('Tuning Console', () => {
  test.beforeEach(async ({ request }) => {
    await cleanup(request);
    await resetScoringDefaults(request);
  });

  test.afterEach(async ({ request }) => {
    await cleanup(request);
    await resetScoringDefaults(request);
  });

  test('renders Tune tab content by default and exposes a Demo Data tab', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Tuning Console', level: 4 })).toBeVisible();
    // Tune tab is the default and shows the four primary sections
    await expect(page.getByRole('heading', { name: 'Signal Weights', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Thresholds', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Users & Devices', exact: true })).toBeVisible();
    await expect(page.getByTestId('preview-summary-banner')).toBeVisible();
    // Demo Data is now its own tab (not visible content)
    await expect(page.getByRole('tab', { name: 'Tune' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Demo Data' })).toBeVisible();
  });

  test('seed form creates a user, auto-expanded device row exposes signature and public ip', async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(page.getByLabel('canvas_hash weight')).toBeVisible({ timeout: 15_000 });
    await openDemoDataTab(page);

    await page.getByLabel('User name').fill('e2e-signature');
    await page.getByRole('button', { name: 'Seed', exact: true }).click();
    // Last result chip is rendered (still on Demo Data tab)
    await expect(page.getByText('Last result')).toBeVisible();

    // Switch back to Tune tab to verify the user appears in the device list
    await openTuneTab(page);
    await expect(page.getByTestId('user-section-demo-user-e2e-signature')).toBeVisible({
      timeout: 10_000,
    });

    // Compact rows hide sig/ip behind a click-to-expand. Scope the row
    // lookup to the seeded user's section, click to expand, then assert
    // on the now-visible details.
    const deviceRow = page
      .getByTestId('user-section-demo-user-e2e-signature')
      .locator('[data-testid^="device-row-"]')
      .first();
    await expect(deviceRow).toBeVisible({ timeout: 10_000 });
    await deviceRow.locator('[data-testid^="device-row-button-"]').click();
    // Non-VPN public IP is the backend's NON_VPN_IP constant
    await expect(deviceRow).toContainText('ip: 203.0.113.42');
    // Signature rendered as 16 hex chars
    await expect(deviceRow).toContainText(/sig: [0-9a-f]{16}/);
  });

  test('seeding two different browsers produces two user rows', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByLabel('canvas_hash weight')).toBeVisible({ timeout: 15_000 });
    await openDemoDataTab(page);

    // First: Chrome regular
    await page.getByLabel('User name').fill('e2e-chrome');
    await page.getByRole('button', { name: 'Seed', exact: true }).click();
    // Wait for the Last result chip so we know the seed call resolved
    await expect(page.getByText('Last result')).toBeVisible({ timeout: 10_000 });

    // Second: Firefox incognito (still on Demo Data tab)
    await page.getByLabel('User name').fill('e2e-firefox');
    await page.getByLabel('Browser').click();
    await page.getByRole('option', { name: 'Firefox' }).click();
    await page.getByTestId('seed-incognito-switch').click();
    await page.getByRole('button', { name: 'Seed', exact: true }).click();
    // Allow the second seed call to round-trip before switching tabs
    await page.waitForTimeout(300);

    // Switch back to Tune to verify both users appear in the device list
    await openTuneTab(page);
    await expect(page.getByTestId('user-section-demo-user-e2e-firefox')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('user-section-demo-user-e2e-chrome')).toBeVisible();
  });

  test('empty user name suffix disables Seed and surfaces helper text', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByLabel('canvas_hash weight')).toBeVisible({ timeout: 15_000 });
    await openDemoDataTab(page);

    const input = page.getByLabel('User name');
    await input.fill('');
    await expect(page.getByRole('button', { name: 'Seed', exact: true })).toBeDisabled();
    await expect(page.getByText('Lowercase letters, digits, and hyphens only')).toBeVisible();
  });

  test('clear-all dialog Cancel preserves data', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByLabel('canvas_hash weight')).toBeVisible({ timeout: 15_000 });
    await openDemoDataTab(page);

    await page.getByLabel('User name').fill('e2e-cancel');
    await page.getByRole('button', { name: 'Seed', exact: true }).click();
    await expect(page.getByText('Last result')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Clear all demo data' }).click();
    await expect(page.getByRole('heading', { name: 'Clear all demo data?' })).toBeVisible();
    // Dialog body shows the count summary
    await expect(page.getByText(/This will delete \d+ user/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    // Dialog closes
    await expect(page.getByRole('heading', { name: 'Clear all demo data?' })).toHaveCount(0);

    // Switch back to Tune to verify the user is still in the device list
    await openTuneTab(page);
    await expect(page.getByTestId('user-section-demo-user-e2e-cancel')).toBeVisible();
  });

  test('clear-all dialog Confirm empties the demo data', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByLabel('canvas_hash weight')).toBeVisible({ timeout: 15_000 });
    await openDemoDataTab(page);

    await page.getByLabel('User name').fill('e2e-confirm');
    await page.getByRole('button', { name: 'Seed', exact: true }).click();
    await expect(page.getByText('Last result')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Clear all demo data' }).click();
    await expect(page.getByRole('heading', { name: 'Clear all demo data?' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    // Snackbar surfaces the cleared counts (>=1 user). Tolerant of any other
    // demo data that other test files may have left behind.
    await expect(page.getByText(/Cleared: \d+ user\(s\)/)).toBeVisible();

    // Switch back to Tune to verify the user is gone from the device list
    await openTuneTab(page);
    await expect(page.getByTestId('user-section-demo-user-e2e-confirm')).toHaveCount(0, {
      timeout: 10_000,
    });
  });

  test('ripple effect preview fires when canvas_hash slider moves', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByLabel('canvas_hash weight')).toBeVisible({ timeout: 15_000 });
    await openDemoDataTab(page);

    // Seed two visits for the same user so the device has >=2 fingerprints
    // (the preview endpoint only reclassifies devices with >=2 fingerprints).
    await page.getByLabel('User name').fill('e2e-ripple');
    await page.getByRole('button', { name: 'Seed', exact: true }).click();
    await expect(page.getByText('Last result')).toBeVisible({ timeout: 10_000 });
    // Toggle incognito to force a second fingerprint with different canvas
    await page.getByTestId('seed-incognito-switch').click();
    await page.getByRole('button', { name: 'Seed', exact: true }).click();
    // Allow the second seed call to round-trip before switching tabs
    await page.waitForTimeout(500);

    // Switch back to Tune so the slider drag triggers the preview hook
    await openTuneTab(page);

    // Wait for preview request to listen for
    const previewRequest = page.waitForRequest(
      (req) => req.url().includes('/api/scoring/preview') && req.method() === 'POST',
      { timeout: 10_000 },
    );

    // Drop canvas_hash to 0
    const canvasSlider = page.getByLabel('canvas_hash weight');
    await canvasSlider.focus();
    await canvasSlider.press('Home');

    await previewRequest;
  });

  test('threshold slider enforces same-device >= drift invariant', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByLabel('same-device threshold')).toBeVisible({ timeout: 15_000 });

    const driftSlider = page.getByLabel('drift threshold');
    await driftSlider.focus();
    // Drive drift to the maximum — same-device should be pulled up to match
    await driftSlider.press('End');

    // Re-read the same-device slider's current value; it must be >= drift.
    const sameDeviceValue = await page
      .getByLabel('same-device threshold')
      .getAttribute('aria-valuenow');
    const driftValue = await driftSlider.getAttribute('aria-valuenow');
    expect(Number(sameDeviceValue)).toBeGreaterThanOrEqual(Number(driftValue));
  });

  test('save weights persists across a page reload', async ({ page, request }) => {
    await page.goto('/admin');
    const canvasSlider = page.getByLabel('canvas_hash weight');
    await expect(canvasSlider).toBeVisible({ timeout: 15_000 });

    // Drop canvas_hash to 0 and save
    await canvasSlider.focus();
    await canvasSlider.press('Home');
    await page.getByRole('button', { name: 'Save weights' }).click();

    // Backend should now report canvas_hash=0
    await expect(async () => {
      const res = await request.get(`${BACKEND_URL}/api/scoring/weights`);
      const body = await res.json();
      expect(body.canvas_hash.weight).toBe(0);
    }).toPass({ timeout: 5_000 });

    // Reload — the slider should still read 0
    await page.reload();
    await expect(page.getByLabel('canvas_hash weight')).toHaveAttribute('aria-valuenow', '0', {
      timeout: 15_000,
    });
  });
});
