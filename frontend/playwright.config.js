import { defineConfig, devices } from '@playwright/test';

const FRONTEND_PORT = parseInt(process.env.VITE_PORT || '5173', 10);
const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:8080';

// Default runs chromium only. Other browsers are configured but opt-in:
//   npm run test:e2e -- --project=firefox
//   npm run test:e2e -- --project=webkit
//   npm run test:e2e -- --project=chromium --project=firefox --project=webkit
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      // Use the full chromium binary (channel: 'chromium') instead of the
      // default chrome-headless-shell, which has a known SIGSEGV crash on
      // some macOS arm64 builds. Run `npx playwright install chromium` once.
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { VITE_API_URL: BACKEND_URL },
    },
  ],
});
