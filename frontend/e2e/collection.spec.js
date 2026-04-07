import { test, expect } from '@playwright/test';

// E2E test that exercises the real flow:
// browser → FingerprintJS → backend /api/collect → UI render.
// Requires the backend to be running at E2E_BACKEND_URL (default localhost:8080).
//
// This test catches the kind of contract bugs that mocked unit tests miss —
// e.g. wrong field types, missing FingerprintJS components, JSON serialization issues.

const TEST_USER = `e2e-${Date.now()}`;

test.describe('Device Identification', () => {
  test('first visit registers a new device, second visit recognizes same device', async ({
    page,
  }) => {
    // First visit
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Device Identification', exact: true }),
    ).toBeVisible();

    await page.getByRole('textbox', { name: 'Enter your name' }).fill(TEST_USER);
    await page.getByRole('button', { name: 'Identify' }).click();

    // Wait for backend response — must succeed (no 4xx) and show NEW_DEVICE
    await expect(page.getByText('NEW_DEVICE')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`New device registered for ${TEST_USER}`)).toBeVisible();

    // Signal breakdown should show real values, not "[object Object]"
    const breakdown = page.getByText(/Signal Breakdown/);
    await expect(breakdown).toBeVisible();
    await breakdown.click();
    await expect(page.getByText('[object Object]')).toHaveCount(0);

    // Second visit — same browser, same fingerprint
    await page.reload();
    await page.getByRole('textbox', { name: 'Enter your name' }).fill(TEST_USER);
    await page.getByRole('button', { name: 'Identify' }).click();

    await expect(page.getByText('SAME_DEVICE')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(new RegExp(`Welcome back ${TEST_USER}`))).toBeVisible();
  });

  // Contract tests at the HTTP boundary: stub /api/collect to verify the
  // frontend UI handles the machineMatch response shape correctly. We use
  // page.route rather than a live backend because real browser fingerprints
  // cannot be precisely controlled to force a machine signature match.
  test('shows Same Machine section when backend returns strong matches', async ({ page }) => {
    const lastSeen = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await page.route('**/api/collect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: 'u-current',
          deviceId: 'd-current',
          deviceLabel: 'Firefox on MacOS',
          matchResult: 'NEW_DEVICE',
          score: 0,
          signalComparisons: [],
          changedSignals: [],
          machineMatch: {
            strongMatches: [
              {
                userId: 'u1',
                userName: 'userA',
                deviceId: 'd1',
                deviceLabel: 'Chrome on MacOS',
                lastSeenAt: lastSeen,
              },
            ],
            possibleMatches: [],
          },
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('textbox', { name: 'Enter your name' }).fill('testuser');
    await page.getByRole('button', { name: 'Identify' }).click();

    await expect(page.getByRole('heading', { name: 'Same machine', exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: 'Matching hardware', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByText('Chrome on MacOS \u00B7 userA')).toBeVisible();
    await expect(
      page.getByText(/Identical hardware may match across unrelated machines/),
    ).toBeVisible();
  });

  test('hides Same Machine panel when both lists are empty', async ({ page }) => {
    await page.route('**/api/collect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: 'u-current',
          deviceId: 'd-current',
          deviceLabel: 'Firefox on MacOS',
          matchResult: 'NEW_DEVICE',
          score: 0,
          signalComparisons: [],
          changedSignals: [],
          machineMatch: { strongMatches: [], possibleMatches: [] },
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('textbox', { name: 'Enter your name' }).fill('testuser');
    await page.getByRole('button', { name: 'Identify' }).click();

    await expect(page.getByText('NEW_DEVICE')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Same machine', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Matching hardware', exact: true })).toHaveCount(
      0,
    );
  });

  test('shows Matching Hardware section when only possibleMatches is non-empty', async ({
    page,
  }) => {
    const lastSeen = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await page.route('**/api/collect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: 'u-current',
          deviceId: 'd-current',
          deviceLabel: 'Firefox on MacOS',
          matchResult: 'NEW_DEVICE',
          score: 0,
          signalComparisons: [],
          changedSignals: [],
          machineMatch: {
            strongMatches: [],
            possibleMatches: [
              {
                userId: 'u1',
                userName: 'userA',
                deviceId: 'd1',
                deviceLabel: 'Chrome',
                lastSeenAt: lastSeen,
              },
            ],
          },
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('textbox', { name: 'Enter your name' }).fill('testuser');
    await page.getByRole('button', { name: 'Identify' }).click();

    await expect(page.getByRole('heading', { name: 'Matching hardware', exact: true })).toBeVisible(
      { timeout: 15_000 },
    );
    await expect(page.getByRole('heading', { name: 'Same machine', exact: true })).toHaveCount(0);
    await expect(
      page.getByText(/Could be the same machine on a different Wi-Fi or VPN/),
    ).toBeVisible();
    await expect(page.getByText('Chrome \u00B7 userA')).toBeVisible();
  });

  // When a privacy extension (uBlock, Brave Shields) blocks the bundled
  // JavaScript script tag, React never mounts. The static fallback inside
  // <div id="root"> in index.html should remain visible to explain the issue.
  // We simulate this by aborting the bundled JS module request.
  test('shows static fallback when JavaScript bundle is blocked', async ({ page }) => {
    await page.route('**/main.jsx*', (route) => route.abort());

    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Application failed to load' })).toBeVisible();
    await expect(page.getByText('uBlock Origin')).toBeVisible();
    await expect(page.getByText('Brave Shields')).toBeVisible();
  });
});
