import { test, expect } from '@playwright/test';

// E2E coverage for the collection flow.
//
// Test 1 exercises the real flow against a live backend (browser →
// FingerprintJS → /api/collect → UI). It catches contract bugs that
// mocked unit tests miss (wrong field types, missing FingerprintJS
// components, JSON serialization issues).
//
// Tests 2–8 are HTTP-boundary contract tests: stub /api/collect via
// page.route to drive the UI through every distinct (Phase 1 verdict
// × Phase 2 panel state) combination from the design table. Stubbing
// is required because real browser fingerprints cannot be precisely
// controlled to force specific machine signature matches.
//
// Test 9 verifies the static HTML fallback when the JS bundle is
// blocked by a privacy extension.

const TEST_USER = `e2e-${Date.now()}`;

const baseResponse = {
  userId: '00000000-0000-0000-0000-000000000001',
  deviceId: '00000000-0000-0000-0000-000000000002',
  deviceLabel: 'Firefox on MacOS',
  matchResult: 'NEW_DEVICE',
  score: 0,
  signalComparisons: [],
  changedSignals: [],
  machineMatch: {
    strongMatches: [],
    possibleMatches: [],
  },
};

function sampleMatch(overrides = {}) {
  return {
    userId: '00000000-0000-0000-0000-000000000003',
    deviceId: '00000000-0000-0000-0000-000000000004',
    deviceLabel: 'Chrome on MacOS',
    userName: 'testuser',
    lastSeenAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    ...overrides,
  };
}

async function stubCollect(page, overrides) {
  const body = {
    ...baseResponse,
    ...overrides,
    machineMatch: {
      ...baseResponse.machineMatch,
      ...(overrides.machineMatch || {}),
    },
  };
  await page.route('**/api/collect', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

async function submitName(page, name) {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Enter your name' }).fill(name);
  await page.getByRole('button', { name: 'Identify' }).click();
}

test.describe('Device Identification', () => {
  test('first visit registers a new device, second visit recognizes same device', async ({
    page,
  }) => {
    // First visit — live backend
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Device Identification', exact: true }),
    ).toBeVisible();

    await page.getByRole('textbox', { name: 'Enter your name' }).fill(TEST_USER);
    await page.getByRole('button', { name: 'Identify' }).click();

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

  test('SAME_DEVICE with Same Machine panel populated', async ({ page }) => {
    await stubCollect(page, {
      matchResult: 'SAME_DEVICE',
      score: 100,
      machineMatch: {
        strongMatches: [sampleMatch()],
        possibleMatches: [],
      },
    });

    await submitName(page, 'testuser');

    await expect(page.getByText('SAME_DEVICE', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('SAME_MACHINE', { exact: true })).toBeVisible();
    await expect(page.getByText(/Welcome back testuser/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Same machine', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Matching hardware', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByText('Chrome on MacOS')).toBeVisible();
  });

  test('SAME_DEVICE with Matching Hardware panel (different network)', async ({ page }) => {
    await stubCollect(page, {
      matchResult: 'SAME_DEVICE',
      score: 100,
      machineMatch: {
        strongMatches: [],
        possibleMatches: [sampleMatch()],
      },
    });

    await submitName(page, 'testuser');

    await expect(page.getByText('SAME_DEVICE', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('MATCHING_HARDWARE', { exact: true })).toBeVisible();
    await expect(page.getByText(/Welcome back testuser/)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Matching hardware', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Same machine', exact: true })).toHaveCount(0);
    await expect(page.getByText('Chrome on MacOS')).toBeVisible();
  });

  test('SAME_DEVICE with both Phase 2 sections hidden (timezone change)', async ({ page }) => {
    await stubCollect(page, {
      matchResult: 'SAME_DEVICE',
      score: 93,
      machineMatch: { strongMatches: [], possibleMatches: [] },
    });

    await submitName(page, 'testuser');

    await expect(page.getByText('SAME_DEVICE', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('NO_MACHINE_MATCH', { exact: true })).toBeVisible();
    await expect(page.getByText(/Welcome back testuser/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Same machine', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Matching hardware', exact: true })).toHaveCount(
      0,
    );
  });

  test('DRIFT_DETECTED with Same Machine panel populated', async ({ page }) => {
    await stubCollect(page, {
      matchResult: 'DRIFT_DETECTED',
      score: 64,
      machineMatch: {
        strongMatches: [sampleMatch()],
        possibleMatches: [],
      },
    });

    await submitName(page, 'testuser');

    await expect(page.getByText('DRIFT_DETECTED', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('SAME_MACHINE', { exact: true })).toBeVisible();
    await expect(page.getByText(/Welcome back testuser/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Same machine', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Matching hardware', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByText('Chrome on MacOS')).toBeVisible();
  });

  test('DRIFT_DETECTED with Matching Hardware panel (different network)', async ({ page }) => {
    await stubCollect(page, {
      matchResult: 'DRIFT_DETECTED',
      score: 64,
      machineMatch: {
        strongMatches: [],
        possibleMatches: [sampleMatch()],
      },
    });

    await submitName(page, 'testuser');

    await expect(page.getByText('DRIFT_DETECTED', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('MATCHING_HARDWARE', { exact: true })).toBeVisible();
    await expect(page.getByText(/Welcome back testuser/)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Matching hardware', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Same machine', exact: true })).toHaveCount(0);
    await expect(page.getByText('Chrome on MacOS')).toBeVisible();
  });

  test('DRIFT_DETECTED with both Phase 2 sections hidden (timezone change)', async ({ page }) => {
    await stubCollect(page, {
      matchResult: 'DRIFT_DETECTED',
      score: 57,
      machineMatch: { strongMatches: [], possibleMatches: [] },
    });

    await submitName(page, 'testuser');

    await expect(page.getByText('DRIFT_DETECTED', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('NO_MACHINE_MATCH', { exact: true })).toBeVisible();
    await expect(page.getByText(/Welcome back testuser/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Same machine', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Matching hardware', exact: true })).toHaveCount(
      0,
    );
  });

  test('NEW_DEVICE with Same Machine panel hidden (no prior data for this user)', async ({
    page,
  }) => {
    await stubCollect(page, {
      matchResult: 'NEW_DEVICE',
      score: 0,
      machineMatch: { strongMatches: [], possibleMatches: [] },
    });

    await submitName(page, 'testuser');

    await expect(page.getByText('NEW_DEVICE', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('NO_MACHINE_MATCH', { exact: true })).toBeVisible();
    await expect(page.getByText(/New device registered for testuser/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Same machine', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Matching hardware', exact: true })).toHaveCount(
      0,
    );
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
